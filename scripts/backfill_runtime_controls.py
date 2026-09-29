"""
Backfill script: fixes existing scan data for the integration correctness pass.
1. Re-correlates runtime_events.asset_id using evidence table file matching
2. Generates controls for all assets in completed scans

Run: python -m services.api.routes.scans_backfill
Or: python scripts/backfill_runtime_controls.py
"""
import psycopg2
import os

DB_URL = 'postgresql://postgres.fpoerukhvqhoyxeqbsgi:ahhafwSRGR13357%5E%5E@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'

def backfill(conn):
    cur = conn.cursor()

    # ── 1. Find all completed scans that need backfill ──────────────────────
    cur.execute("""
        SELECT id, project_id FROM scan_runs
        WHERE status = 'COMPLETED'
        ORDER BY completed_at DESC
    """)
    scans = cur.fetchall()
    print(f"Found {len(scans)} completed scans to process")

    for scan_id, project_id in scans:
        print(f"\n--- Scan {scan_id} (project {project_id}) ---")
        _backfill_scan(cur, conn, scan_id, project_id)

    cur.close()
    print("\nBackfill complete.")


def _backfill_scan(cur, conn, scan_id, project_id):
    # ── 1a. Load all assets for this scan ──────────────────────────────────
    cur.execute(
        "SELECT id, algorithm FROM crypto_assets WHERE scan_id = %s",
        (scan_id,)
    )
    assets = cur.fetchall()  # [(id, algorithm)]
    asset_ids = [str(a[0]) for a in assets]

    if not asset_ids:
        print("  No assets — skipping")
        return

    # ── 1b. Build file-stem → asset_id lookup from evidence table ───────────
    placeholders = ','.join(['%s'] * len(asset_ids))
    cur.execute(f"""
        SELECT asset_id, file FROM evidence
        WHERE asset_id IN ({placeholders})
          AND evidence_type = 'static_code'
    """, asset_ids)
    ev_rows = cur.fetchall()

    evidence_file_to_assets = {}  # stem -> [asset_id]
    for asset_id, ev_file in ev_rows:
        if ev_file:
            stem = ev_file.split('/')[-1].replace('.py', '')
            evidence_file_to_assets.setdefault(stem, []).append(str(asset_id))

    # Build algo -> asset_id map
    algo_to_asset = {}
    for asset_id, algorithm in assets:
        if algorithm:
            algo_to_asset[algorithm.upper()] = str(asset_id)

    print(f"  Assets: {len(assets)}, evidence file stems: {len(evidence_file_to_assets)}, algos: {list(algo_to_asset.keys())}")

    # ── 1c. Re-correlate runtime_events ─────────────────────────────────────
    cur.execute("""
        SELECT id, algorithm, source_file, source_locator, entrypoint
        FROM runtime_events
        WHERE scan_id = %s AND asset_id IS NULL
    """, (scan_id,))
    uncorrelated = cur.fetchall()
    print(f"  Runtime events to correlate: {len(uncorrelated)}")

    correlated_count = 0
    for ev_id, ev_algo, ev_source_file, ev_locator, ev_entrypoint in uncorrelated:
        matched_asset_id = None

        # Try source_file first
        source = ev_source_file or (ev_locator.split(':')[0] if ev_locator else None)
        if source:
            stem = source.split('/')[-1].replace('.py', '')
            candidates = evidence_file_to_assets.get(stem, [])
            if candidates:
                ev_algo_upper = (ev_algo or '').upper()
                for cid in candidates:
                    asset_algo = algo_to_asset.get(ev_algo_upper, '')
                    if str(cid) == str(asset_algo):
                        matched_asset_id = cid
                        break
                if not matched_asset_id:
                    matched_asset_id = candidates[0]

        # Fall back to algorithm match
        if not matched_asset_id and ev_algo:
            matched_asset_id = algo_to_asset.get(ev_algo.upper())

        if matched_asset_id:
            cur.execute(
                "UPDATE runtime_events SET asset_id = %s WHERE id = %s",
                (matched_asset_id, ev_id)
            )
            correlated_count += 1

    conn.commit()
    print(f"  Correlated {correlated_count}/{len(uncorrelated)} runtime events")

    # ── 1d. Check if controls already exist for this scan ───────────────────
    cur.execute(f"""
        SELECT COUNT(*) FROM controls
        WHERE crypto_asset_id IN ({placeholders})
    """, asset_ids)
    existing_controls = cur.fetchone()[0]

    if existing_controls > 0:
        print(f"  Controls already exist: {existing_controls} — skipping control generation")
    else:
        # ── 1e. Generate controls ────────────────────────────────────────────
        pqc_concern = {'RSA', 'EC', 'ECDSA', 'ECDH'}

        # Fetch key_contexts for this scan
        cur.execute("SELECT key_id_name, rotation_state FROM key_contexts WHERE scan_id = %s", (scan_id,))
        keys = cur.fetchall()
        has_kms = len(keys) > 0
        key_with_rotation = next((k for k in keys if k[1]), None)

        controls_created = 0
        for asset_id, algorithm in assets:
            algo_upper = (algorithm or '').upper()
            has_abstraction = False  # No library field available here simply

            control_records = [
                ("Key Custody (KMS/HSM)", "PRESENT" if has_kms else "UNKNOWN",
                 "key_metadata.json" if has_kms else None),
                ("Key Rotation Policy", "PRESENT" if key_with_rotation else "UNKNOWN",
                 f"rotation_policy={key_with_rotation[1]}" if key_with_rotation else None),
                ("Crypto Abstraction Layer", "ABSENT",
                 "Direct algorithm usage detected"),
                ("Post-Quantum Readiness",
                 "ABSENT" if algo_upper in pqc_concern else "UNKNOWN",
                 f"{algo_upper} is not post-quantum resistant" if algo_upper in pqc_concern
                 else f"{algo_upper} not evaluated for PQC"),
            ]

            for ctrl_name, ctrl_state, evidence_text in control_records:
                try:
                    cur.execute("""
                        INSERT INTO controls (project_id, crypto_asset_id, control_name, control_state, evidence)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (str(project_id), str(asset_id), ctrl_name, ctrl_state, evidence_text))
                    controls_created += 1
                except Exception as e:
                    print(f"    Control insert error: {e}")

        conn.commit()
        print(f"  Created {controls_created} control records")

    # ── 1f. Fix crypto_paths.scan_id if NULL ───────────────────────────────
    cur.execute(f"""
        UPDATE crypto_paths SET scan_id = %s
        WHERE crypto_asset_id IN ({placeholders})
          AND scan_id IS NULL
    """, [scan_id] + asset_ids)
    paths_fixed = cur.rowcount
    conn.commit()
    if paths_fixed:
        print(f"  Fixed {paths_fixed} crypto_paths with scan_id")


if __name__ == "__main__":
    conn = psycopg2.connect(DB_URL)
    try:
        backfill(conn)
    finally:
        conn.close()
