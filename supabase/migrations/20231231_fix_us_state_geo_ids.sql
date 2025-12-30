-- Fix US state geo_id values to match TopoJSON format
-- This migration fixes territories that were created with incorrect geo_id format
-- Also clears all ownership to reset territories to unclaimed state

-- Clear all ownership records for US states
DELETE FROM ownership WHERE territory_id IN (
  SELECT id FROM territories WHERE type = 'us_state'
);

-- Alabama: US-1 -> 01
UPDATE territories 
SET geo_id = '01' 
WHERE type = 'us_state' AND name = 'Alabama';

-- Alaska: US-2 -> 02
UPDATE territories 
SET geo_id = '02' 
WHERE type = 'us_state' AND name = 'Alaska';

-- Arizona: US-4 -> 04
UPDATE territories 
SET geo_id = '04' 
WHERE type = 'us_state' AND name = 'Arizona';

-- Arkansas: US-5 -> 05
UPDATE territories 
SET geo_id = '05' 
WHERE type = 'us_state' AND name = 'Arkansas';

-- California: US-6 -> 06
UPDATE territories 
SET geo_id = '06' 
WHERE type = 'us_state' AND name = 'California';

-- Colorado: US-8 -> 08
UPDATE territories 
SET geo_id = '08' 
WHERE type = 'us_state' AND name = 'Colorado';

-- Connecticut: US-9 -> 09
UPDATE territories 
SET geo_id = '09' 
WHERE type = 'us_state' AND name = 'Connecticut';

-- Delaware: US-10 -> 10
UPDATE territories 
SET geo_id = '10' 
WHERE type = 'us_state' AND name = 'Delaware';

-- District of Columbia: US-11 -> 11
UPDATE territories 
SET geo_id = '11' 
WHERE type = 'us_state' AND name = 'District of Columbia';

-- Florida: US-12 -> 12
UPDATE territories 
SET geo_id = '12' 
WHERE type = 'us_state' AND name = 'Florida';

-- Georgia: US-13 -> 13
UPDATE territories 
SET geo_id = '13' 
WHERE type = 'us_state' AND name = 'Georgia';

-- Hawaii: US-15 -> 15
UPDATE territories 
SET geo_id = '15' 
WHERE type = 'us_state' AND name = 'Hawaii';

-- Idaho: US-16 -> 16
UPDATE territories 
SET geo_id = '16' 
WHERE type = 'us_state' AND name = 'Idaho';

-- Illinois: US-17 -> 17
UPDATE territories 
SET geo_id = '17' 
WHERE type = 'us_state' AND name = 'Illinois';

-- Indiana: US-18 -> 18
UPDATE territories 
SET geo_id = '18' 
WHERE type = 'us_state' AND name = 'Indiana';

-- Iowa: US-19 -> 19
UPDATE territories 
SET geo_id = '19' 
WHERE type = 'us_state' AND name = 'Iowa';

-- Kansas: US-20 -> 20
UPDATE territories 
SET geo_id = '20' 
WHERE type = 'us_state' AND name = 'Kansas';

-- Kentucky: US-21 -> 21
UPDATE territories 
SET geo_id = '21' 
WHERE type = 'us_state' AND name = 'Kentucky';

-- Louisiana: US-22 -> 22
UPDATE territories 
SET geo_id = '22' 
WHERE type = 'us_state' AND name = 'Louisiana';

-- Maine: US-23 -> 23
UPDATE territories 
SET geo_id = '23' 
WHERE type = 'us_state' AND name = 'Maine';

-- Maryland: US-24 -> 24
UPDATE territories 
SET geo_id = '24' 
WHERE type = 'us_state' AND name = 'Maryland';

-- Massachusetts: US-25 -> 25
UPDATE territories 
SET geo_id = '25' 
WHERE type = 'us_state' AND name = 'Massachusetts';

-- Michigan: US-26 -> 26
UPDATE territories 
SET geo_id = '26' 
WHERE type = 'us_state' AND name = 'Michigan';

-- Minnesota: US-27 -> 27
UPDATE territories 
SET geo_id = '27' 
WHERE type = 'us_state' AND name = 'Minnesota';

-- Mississippi: US-28 -> 28
UPDATE territories 
SET geo_id = '28' 
WHERE type = 'us_state' AND name = 'Mississippi';

-- Missouri: US-29 -> 29
UPDATE territories 
SET geo_id = '29' 
WHERE type = 'us_state' AND name = 'Missouri';

-- Montana: US-30 -> 30
UPDATE territories 
SET geo_id = '30' 
WHERE type = 'us_state' AND name = 'Montana';

-- Nebraska: US-31 -> 31
UPDATE territories 
SET geo_id = '31' 
WHERE type = 'us_state' AND name = 'Nebraska';

-- Nevada: US-32 -> 32
UPDATE territories 
SET geo_id = '32' 
WHERE type = 'us_state' AND name = 'Nevada';

-- New Hampshire: US-33 -> 33
UPDATE territories 
SET geo_id = '33' 
WHERE type = 'us_state' AND name = 'New Hampshire';

-- New Jersey: US-34 -> 34
UPDATE territories 
SET geo_id = '34' 
WHERE type = 'us_state' AND name = 'New Jersey';

-- New Mexico: US-35 -> 35
UPDATE territories 
SET geo_id = '35' 
WHERE type = 'us_state' AND name = 'New Mexico';

-- New York: US-36 -> 36
UPDATE territories 
SET geo_id = '36' 
WHERE type = 'us_state' AND name = 'New York';

-- North Carolina: US-37 -> 37
UPDATE territories 
SET geo_id = '37' 
WHERE type = 'us_state' AND name = 'North Carolina';

-- North Dakota: US-38 -> 38
UPDATE territories 
SET geo_id = '38' 
WHERE type = 'us_state' AND name = 'North Dakota';

-- Ohio: US-39 -> 39
UPDATE territories 
SET geo_id = '39' 
WHERE type = 'us_state' AND name = 'Ohio';

-- Oklahoma: US-40 -> 40
UPDATE territories 
SET geo_id = '40' 
WHERE type = 'us_state' AND name = 'Oklahoma';

-- Oregon: US-41 -> 41
UPDATE territories 
SET geo_id = '41' 
WHERE type = 'us_state' AND name = 'Oregon';

-- Pennsylvania: US-42 -> 42
UPDATE territories 
SET geo_id = '42' 
WHERE type = 'us_state' AND name = 'Pennsylvania';

-- Rhode Island: US-44 -> 44
UPDATE territories 
SET geo_id = '44' 
WHERE type = 'us_state' AND name = 'Rhode Island';

-- South Carolina: US-45 -> 45
UPDATE territories 
SET geo_id = '45' 
WHERE type = 'us_state' AND name = 'South Carolina';

-- South Dakota: US-46 -> 46
UPDATE territories 
SET geo_id = '46' 
WHERE type = 'us_state' AND name = 'South Dakota';

-- Tennessee: US-47 -> 47
UPDATE territories 
SET geo_id = '47' 
WHERE type = 'us_state' AND name = 'Tennessee';

-- Texas: US-48 -> 48
UPDATE territories 
SET geo_id = '48' 
WHERE type = 'us_state' AND name = 'Texas';

-- Utah: US-49 -> 49
UPDATE territories 
SET geo_id = '49' 
WHERE type = 'us_state' AND name = 'Utah';

-- Vermont: US-50 -> 50
UPDATE territories 
SET geo_id = '50' 
WHERE type = 'us_state' AND name = 'Vermont';

-- Virginia: US-51 -> 51
UPDATE territories 
SET geo_id = '51' 
WHERE type = 'us_state' AND name = 'Virginia';

-- Washington: US-53 -> 53
UPDATE territories 
SET geo_id = '53' 
WHERE type = 'us_state' AND name = 'Washington';

-- West Virginia: US-54 -> 54
UPDATE territories 
SET geo_id = '54' 
WHERE type = 'us_state' AND name = 'West Virginia';

-- Wisconsin: US-55 -> 55
UPDATE territories 
SET geo_id = '55' 
WHERE type = 'us_state' AND name = 'Wisconsin';

-- Wyoming: US-56 -> 56
UPDATE territories 
SET geo_id = '56' 
WHERE type = 'us_state' AND name = 'Wyoming';
