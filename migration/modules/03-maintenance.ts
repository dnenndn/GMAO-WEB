/**
 * Tier: maintenance — depends on core + master tiers (needs Utilisateur,
 * ParametreClasseIntervention, Intervenant, ParametreAnomalie, Equipement
 * all already migrated).
 *
 * `createur` fields: confirmed by reading the actual Prisma @relation
 * definition (not assumed) that `OrdreTravail.createur` /
 * `DemandeIntervention.createur` are real foreign keys to
 * `Utilisateur.login` in the target schema — but the source column is an
 * `int` (Utilisateur.id). Since this migration preserves original ids
 * (see migration/README.md), resolving this just means looking up the
 * migrated user's login by that same id — buildUserLoginLookup() below
 * does this once per tier run rather than per row. Falls back to `null`
 * (the field is optional) rather than inventing a placeholder user, for
 * any source createur id that doesn't resolve — e.g. already deleted at
 * the source.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

export async function migrateMaintenanceData(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateGammeOperatoire(prisma, dryRun);
  await migrateDemandeIntervention(prisma, dryRun, loginById);
  await migrateOrdreTravail(prisma, dryRun, loginById);
}

// ----------------------------------------------------------------------------

async function migrateGammeOperatoire(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_plan, code, designation, urgence, statut, type, id_classe,
           id_superviseur, duree, var_duree, deleted, operation, p_typpe
    FROM gamme_operatoire
  `);
  console.log(`gamme_operatoire: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.gammeOperatoire.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idPlan: toNumOrNull(r.id_plan),
        code: toStrOrNull(r.code),
        designation: r.designation,
        urgence: toStrOrNull(r.urgence),
        statut: toStrOrNull(r.statut),
        type: toStrOrNull(r.type),
        idClasse: toNumOrNull(r.id_classe),
        idSuperviseur: toNumOrNull(r.id_superviseur),
        duree: toNumOrNull(r.duree),
        varDuree: toStrOrNull(r.var_duree),
        deleted: toBool(r.deleted),
        operation: toStrOrNull(r.operation),
        pTyppe: toNumOrNull(r.p_typpe),
      },
    });
  }
  await resetSequence(prisma, "gamme_operatoire");
}

async function migrateDemandeIntervention(
  prisma: PrismaClient,
  dryRun: boolean,
  loginById: Map<number, string>
) {
  const rows = await queryAll(`
    SELECT id, id_demandeur, date_emission, heure_emission, urgence, id_defaillance,
           description_defaillance, createur, atelier, equipement, sous_equipement,
           organe, arret_machine, date_arret, heure_arret, statut, n_di, deleted
    FROM demande_intervention
  `);
  console.log(`demande_intervention: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.demandeIntervention.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDemandeur: toNumOrNull(r.id_demandeur),
        dateEmission: toDate(r.date_emission) ?? new Date(),
        heureEmission: toStrOrNull(r.heure_emission),
        urgence: toStrOrNull(r.urgence),
        idDefaillance: toNumOrNull(r.id_defaillance),
        descriptionDefaillance: toStrOrNull(r.description_defaillance),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        atelier: toNumOrNull(r.atelier),
        equipement: toNumOrNull(r.equipement),
        sousEquipement: toNumOrNull(r.sous_equipement),
        organe: toNumOrNull(r.organe),
        // Real column is varchar(3), "Oui"/"Non" — see schema comment.
        arretMachine: r.arret_machine == null ? null : String(r.arret_machine).trim() === "Oui",
        dateArret: toDate(r.date_arret),
        heureArret: toStrOrNull(r.heure_arret),
        statut: toStrOrNull(r.statut),
        nDi: toStrOrNull(r.n_di),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "demande_intervention");
}


type OrdreTravailForeignKey = {
  constraintName: string;
  childColumn: string;
  parentTable: string;
  parentColumn: string;
};

async function loadOrdreTravailForeignKeys(prisma: PrismaClient): Promise<OrdreTravailForeignKey[]> {
  // Cast the result rather than passing a generic type argument directly
  // to $queryRawUnsafe(...) — the generic-call syntax only compiles when
  // the ambient Prisma Client types fully resolve at build time, which
  // isn't guaranteed in every environment. Casting afterward is exactly
  // as type-safe here (this is a raw, unchecked SQL query either way —
  // the real safety already comes from the query itself, not from which
  // syntax passes the expected shape to TypeScript) and compiles
  // reliably regardless.
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      c.conname AS "constraintName",
      child_att.attname AS "childColumn",
      parent_cls.relname AS "parentTable",
      parent_att.attname AS "parentColumn"
    FROM pg_constraint c
    JOIN pg_class child_cls ON child_cls.oid = c.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child_cls.relnamespace
    JOIN pg_class parent_cls ON parent_cls.oid = c.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent_cls.relnamespace
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS child_key(attnum, ord) ON TRUE
    JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS parent_key(attnum, ord)
      ON parent_key.ord = child_key.ord
    JOIN pg_attribute child_att
      ON child_att.attrelid = c.conrelid AND child_att.attnum = child_key.attnum
    JOIN pg_attribute parent_att
      ON parent_att.attrelid = c.confrelid AND parent_att.attnum = parent_key.attnum
    WHERE c.contype = 'f'
      AND child_ns.nspname = current_schema()
      AND parent_ns.nspname = current_schema()
      AND child_cls.relname = 'ordre_travail'
    ORDER BY c.conname, child_key.ord
  `);
  return rows as OrdreTravailForeignKey[];
}

function snakeToCamel(name: string): string {
  return name.replace(/_([a-z])/g, (_, c) => String(c).toUpperCase());
}

async function validateOrdreTravailForeignKeys(
  prisma: PrismaClient,
  rows: any[]
): Promise<Map<number, Set<string>>> {
  const fks = await loadOrdreTravailForeignKeys(prisma);
  const nullByOtId = new Map<number, Set<string>>();

  if (!fks.length) {
    console.log(`  ✓ ordre_travail: no PostgreSQL foreign keys found to validate.`);
    return nullByOtId;
  }

  const validValues = new Map<string, Set<any>>();
  const diagnostics = new Map<string, { invalid: number; examples: string[] }>();

  for (const fk of fks) {
    const key = `${fk.parentTable}.${fk.parentColumn}`;
    if (!validValues.has(key)) {
      // Same fix as loadOrdreTravailForeignKeys above — cast after the
      // call instead of passing a generic type argument directly to
      // $queryRawUnsafe(...), which only compiles when the ambient
      // Prisma Client types fully resolve.
      const values = (await prisma.$queryRawUnsafe(
        `SELECT "${fk.parentColumn}" AS "value" FROM "${fk.parentTable}"`
      )) as any[];
      validValues.set(key, new Set(values.map(v => v.value)));
    }
    if (!diagnostics.has(fk.constraintName)) {
      diagnostics.set(fk.constraintName, { invalid: 0, examples: [] });
    }
  }

  for (const row of rows) {
    const otId = Number(row.id);

    for (const fk of fks) {
      const sourceColumn = fk.childColumn;
      const rawValue = row[sourceColumn];

      if (rawValue === null || rawValue === undefined) continue;

      // createur is special: source = utilisateur.id, target = utilisateur.login.
      // It is resolved separately through loginById and therefore must not be
      // compared numerically with the target login column here.
      if (sourceColumn === "createur") continue;

      // Legacy id_intervention is polymorphic: for Preventive OTs it points
      // to gamme_operatoire, while the target FK on ordre_travail points to
      // parametre_intervention. The create payload already nulls Preventive
      // values, so do not report those source values as dangling Corrective FKs.
      if (sourceColumn === "id_intervention" &&
          !(typeof row.type === "string" && row.type.startsWith("Corrective"))) {
        continue;
      }

      const value = toNumOrNull(rawValue);
      const parentKey = `${fk.parentTable}.${fk.parentColumn}`;
      const valid = validValues.get(parentKey)!;

      if (value === null || !valid.has(value)) {
        const d = diagnostics.get(fk.constraintName)!;
        d.invalid++;
        if (d.examples.length < 5) {
          d.examples.push(`OT ${otId}: ${sourceColumn}=${String(rawValue)}`);
        }

        const property = snakeToCamel(sourceColumn);
        if (!nullByOtId.has(otId)) nullByOtId.set(otId, new Set());
        nullByOtId.get(otId)!.add(property);
      }
    }
  }

  console.log(`  FK validation for ordre_travail:`);
  for (const fk of fks) {
    const d = diagnostics.get(fk.constraintName)!;
    const target = `${fk.parentTable}.${fk.parentColumn}`;
    if (d.invalid === 0) {
      console.log(`    ✓ ${fk.childColumn} → ${target}: all references valid`);
    } else {
      console.log(`    ⚠ ${fk.childColumn} → ${target}: ${d.invalid} dangling reference(s) will be nulled`);
      for (const example of d.examples) console.log(`      - ${example}`);
      if (d.invalid > d.examples.length) {
        console.log(`      ... ${d.invalid - d.examples.length} more`);
      }
    }
  }

  return nullByOtId;
}

async function migrateOrdreTravail(
  prisma: PrismaClient,
  dryRun: boolean,
  loginById: Map<number, string>
) {
  const rows = await queryAll(`
    SELECT id, n_ot, id_di, date_debut, heure_debut, date_fin, heure_fin, urgence,
           id_intervention, statut, type, id_classe, id_superviseur, commentaire,
           createur, deleted, atelier, equipement, sous_equipement, organe,
           id_defaillance, debut_prevu, fin_prevu
    FROM ordre_travail
  `);
  console.log(`ordre_travail: ${rows.length} rows`);
  if (dryRun) return;

  const nullByOtId = await validateOrdreTravailForeignKeys(prisma, rows as any[]);
  let nulledReferences = 0;

  for (const r of rows as any[]) {
    const createData: any = {
      id: r.id,
      nOt: r.n_ot,
      idDi: toNumOrNull(r.id_di),
      dateDebut: toDate(r.date_debut),
      heureDebut: toStrOrNull(r.heure_debut),
      dateFin: toDate(r.date_fin),
      heureFin: toStrOrNull(r.heure_fin),
      debutPrevu: toDate(r.debut_prevu),
      finPrevu: toDate(r.fin_prevu),
      urgence: toStrOrNull(r.urgence),
      statut: r.statut,
      type: r.type,
      // id_intervention is polymorphic in the legacy schema. Only Corrective
      // OTs use the ParametreIntervention FK in the target schema.
      idIntervention:
        typeof r.type === "string" && r.type.startsWith("Corrective")
          ? toNumOrNull(r.id_intervention)
          : null,
      idClasse: toNumOrNull(r.id_classe),
      idSuperviseur: toNumOrNull(r.id_superviseur),
      commentaire: toStrOrNull(r.commentaire),
      createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
      deleted: toBool(r.deleted),
      atelier: toNumOrNull(r.atelier),
      equipement: toNumOrNull(r.equipement),
      sousEquipement: toNumOrNull(r.sous_equipement),
      organe: toNumOrNull(r.organe),
      idDefaillance: toNumOrNull(r.id_defaillance),
    };

    // PostgreSQL metadata validation above identifies every declared FK on
    // ordre_travail. Null only the invalid relationship; keep the OT itself.
    const nulls = nullByOtId.get(Number(r.id));
    if (nulls) {
      for (const property of nulls) {
        if (createData[property] !== null) {
          createData[property] = null;
          nulledReferences++;
        }
      }
    }

    const sourceCreateur = toNumOrNull(r.createur);
    if (sourceCreateur !== null && !loginById.has(sourceCreateur)) {
      console.log(`  ⚠ OT ${r.id}: createur=${sourceCreateur} has no migrated utilisateur → nulled`);
    }

    try {
      await prisma.ordreTravail.upsert({
        where: { id: r.id },
        update: {},
        create: createData,
      });
    } catch (error: any) {
      if (error?.code === "P2003") {
        console.error(`\n  ✖ FK failure while migrating ordre_travail id=${r.id}, n_ot=${String(r.n_ot)}`);
        console.error(`    Prisma field: ${error?.meta?.field_name ?? "(not available)"}`);
        console.error(`    create payload: ${JSON.stringify(createData)}`);
      }
      throw error;
    }
  }

  if (nulledReferences > 0) {
    console.log(`  ⚠ ordre_travail: ${nulledReferences} dangling FK value(s) were nulled.`);
  } else {
    console.log(`  ✓ ordre_travail: no dangling FK values required nulling.`);
  }
  await resetSequence(prisma, "ordre_travail");
}
