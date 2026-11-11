-- CareerTrack demonstration data: the five original (fictional) records.
--
-- Run this once in the Neon SQL Editor after db/schema.sql.
-- It is safe to run again: ON CONFLICT DO NOTHING skips records that exist.
INSERT INTO applications (id, company, role, stage, applied_date) VALUES
  ('APP-001', 'Northstar Logistics',   'Data Analyst',                 'applied',   '2026-11-01'),
  ('APP-002', 'BluePeak Analytics',    'Business Analyst',             'interview', '2026-11-02'),
  ('APP-003', 'BrightPath Consulting', 'AI Implementation Specialist', 'applied',   '2026-11-03'),
  ('APP-004', 'Summit Retail',         'Reporting Analyst',            'offer',     '2026-11-04'),
  ('APP-005', 'Horizon Supply',        'Supply Chain Analyst',         'rejected',  '2026-11-05')
ON CONFLICT (id) DO NOTHING;
