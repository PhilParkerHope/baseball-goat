// Builds the database from the Lahman CSVs: schema -> raw import -> derived tables.
// Safe to re-run; raw tables are emptied and reloaded each time.
//
//   node --env-file=.env.local scripts/build-db.mjs ./data/lahman
//
// DATABASE_URL must be a direct or session-pooler connection (port 5432).

import { createReadStream, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import postgres from 'postgres'

const csvDir = process.argv[2]
if (!csvDir || !process.env.DATABASE_URL) {
  console.error('Usage: DATABASE_URL=... node scripts/build-db.mjs <folder with Lahman CSVs>')
  process.exit(1)
}

// max: 1 keeps everything on one connection, which temp tables need.
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
const dbDir = path.join(import.meta.dirname, '..', 'db')

// table -> { Postgres column: Lahman CSV header }. Headers match case-insensitively,
// and CSV columns not listed here are ignored.
const TABLES = {
  people: {
    file: 'People.csv',
    columns: {
      player_id: 'playerID', name_first: 'nameFirst', name_last: 'nameLast', name_given: 'nameGiven',
      birth_year: 'birthYear', birth_month: 'birthMonth', birth_day: 'birthDay',
      birth_country: 'birthCountry', death_year: 'deathYear', bats: 'bats', throws: 'throws',
      debut: 'debut', final_game: 'finalGame', bbref_id: 'bbrefID', retro_id: 'retroID',
    },
  },
  batting: {
    file: 'Batting.csv',
    columns: {
      player_id: 'playerID', year_id: 'yearID', stint: 'stint', team_id: 'teamID', lg_id: 'lgID',
      g: 'G', ab: 'AB', r: 'R', h: 'H', doubles: '2B', triples: '3B', hr: 'HR', rbi: 'RBI',
      sb: 'SB', cs: 'CS', bb: 'BB', so: 'SO', ibb: 'IBB', hbp: 'HBP', sh: 'SH', sf: 'SF', gidp: 'GIDP',
    },
  },
  pitching: {
    file: 'Pitching.csv',
    columns: {
      player_id: 'playerID', year_id: 'yearID', stint: 'stint', team_id: 'teamID', lg_id: 'lgID',
      w: 'W', l: 'L', g: 'G', gs: 'GS', cg: 'CG', sho: 'SHO', sv: 'SV', ipouts: 'IPouts',
      h: 'H', er: 'ER', hr: 'HR', bb: 'BB', so: 'SO', ibb: 'IBB', wp: 'WP', hbp: 'HBP',
      bk: 'BK', bfp: 'BFP', gf: 'GF', r: 'R',
    },
  },
  teams: {
    file: 'Teams.csv',
    columns: {
      year_id: 'yearID', team_id: 'teamID', lg_id: 'lgID', franch_id: 'franchID', name: 'name',
      park: 'park', g: 'G', w: 'W', l: 'L', r: 'R', ra: 'RA', er: 'ER', ipouts: 'IPouts',
      bpf: 'BPF', ppf: 'PPF',
    },
  },
  appearances: {
    file: 'Appearances.csv',
    columns: {
      player_id: 'playerID', year_id: 'yearID', team_id: 'teamID', lg_id: 'lgID',
      g_all: 'G_all', g_batting: 'G_batting', g_defense: 'G_defense', g_p: 'G_p', g_c: 'G_c',
      g_1b: 'G_1b', g_2b: 'G_2b', g_3b: 'G_3b', g_ss: 'G_ss', g_lf: 'G_lf', g_cf: 'G_cf',
      g_rf: 'G_rf', g_of: 'G_of', g_dh: 'G_dh', g_ph: 'G_ph', g_pr: 'G_pr',
    },
  },
}

async function readHeader(file) {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  for await (const line of lines) {
    lines.close()
    return line.replace(/^﻿/, '').split(',').map((h) => h.replace(/"/g, '').trim())
  }
  throw new Error(`${file} is empty`)
}

// Lahman has shipped these files as People.csv and as people.csv; accept either.
function findFile(name) {
  const match = readdirSync(csvDir).find((f) => f.toLowerCase() === name.toLowerCase())
  if (!match) throw new Error(`Can't find ${name} in ${csvDir}`)
  return path.join(csvDir, match)
}

async function importTable(table, { file, columns }) {
  const csvPath = findFile(file)
  const header = await readHeader(csvPath)
  const lower = header.map((h) => h.toLowerCase())

  // Load the CSV as-is into an all-text staging table, then cast into the real one.
  const stage = `stage_${table}`
  await sql.unsafe(`drop table if exists ${stage}`)
  await sql.unsafe(`create temp table ${stage} (${header.map((_, i) => `c${i} text`).join(', ')})`)
  const copy = await sql.unsafe(`copy ${stage} from stdin with (format csv, header true)`).writable()
  await pipeline(createReadStream(csvPath), copy)

  const types = Object.fromEntries(
    (await sql`
      select column_name, udt_name from information_schema.columns
      where table_schema = 'lahman' and table_name = ${table}
    `).map((c) => [c.column_name, c.udt_name]),
  )

  const selects = Object.entries(columns).map(([pgCol, csvCol]) => {
    const i = lower.indexOf(csvCol.toLowerCase())
    if (i === -1) throw new Error(`${file} has no "${csvCol}" column. Header: ${header.join(',')}`)
    const value = `nullif(trim(c${i}), '')`
    // ::numeric first so a value like "215.0" still lands in an int column.
    return types[pgCol] === 'int4' ? `${value}::numeric::int` : `${value}::${types[pgCol]}`
  })

  await sql.unsafe(`truncate lahman.${table}`)
  const result = await sql.unsafe(
    `insert into lahman.${table} (${Object.keys(columns).join(', ')}) select ${selects.join(', ')} from ${stage}`,
  )
  await sql.unsafe(`drop table ${stage}`)
  console.log(`  lahman.${table}: ${result.count} rows`)
}

try {
  console.log('Creating schema...')
  await sql.file(path.join(dbDir, '01_lahman_raw.sql'))
  await sql.file(path.join(dbDir, '02_batting_value_tables.sql'))

  console.log('Importing Lahman CSVs...')
  for (const [table, config] of Object.entries(TABLES)) await importTable(table, config)

  console.log('Computing batting runs...')
  await sql.file(path.join(dbDir, '03_compute_batting_runs.sql'))

     console.log('Computing hitter value...')
   await sql.file(path.join(dbDir, '04_compute_hitter_value.sql'))

      console.log('Computing pitcher value...')
   await sql.file(path.join(dbDir, '05_compute_pitcher_value.sql'))

      console.log('Building players...')
   await sql.file(path.join(dbDir, '06_compute_players.sql'))

      console.log('Building team lists...')
   await sql.file(path.join(dbDir, '07_compute_player_teams.sql'))

      console.log('Building team lineups...')
   await sql.file(path.join(dbDir, '08_compute_franchise_players.sql'))

  const [{ count }] = await sql`select count(*) from public.player_batting_seasons`
  console.log(`Done. ${count} player-seasons.`)
} finally {
  await sql.end()
}
