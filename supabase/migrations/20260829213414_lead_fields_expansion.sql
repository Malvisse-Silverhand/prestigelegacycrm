-- Lead field expansion (Batch D, Part 1): postcode, agent_remark, and
-- constraining state/lead_source to fixed lists. Additive except for the
-- state/lead_source type changes, which are a lossy migration of existing
-- free-text values -- see the Batch D report for the full before/after
-- mapping table of every distinct value this touched.

alter table leads
	add column postcode text,
	add column agent_remark text;

-- STATE -> fixed enum -----------------------------------------------------
create type malaysian_state as enum (
	'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak',
	'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
	'Wilayah Persekutuan Kuala Lumpur', 'Wilayah Persekutuan Labuan',
	'Wilayah Persekutuan Putrajaya'
);

alter table leads add column state_new malaysian_state;

-- Best-effort case-insensitive match against the fixed list, including a
-- few common short forms/spellings. Anything that doesn't match -> null
-- (not a guess) rather than silently defaulting to some state.
update leads set state_new = (
	case trim(lower(state))
		when 'johor' then 'Johor'
		when 'kedah' then 'Kedah'
		when 'kelantan' then 'Kelantan'
		when 'melaka' then 'Melaka'
		when 'malacca' then 'Melaka'
		when 'negeri sembilan' then 'Negeri Sembilan'
		when 'n. sembilan' then 'Negeri Sembilan'
		when 'ns' then 'Negeri Sembilan'
		when 'pahang' then 'Pahang'
		when 'perak' then 'Perak'
		when 'perlis' then 'Perlis'
		when 'pulau pinang' then 'Pulau Pinang'
		when 'penang' then 'Pulau Pinang'
		when 'sabah' then 'Sabah'
		when 'sarawak' then 'Sarawak'
		when 'selangor' then 'Selangor'
		when 'terengganu' then 'Terengganu'
		when 'wilayah persekutuan kuala lumpur' then 'Wilayah Persekutuan Kuala Lumpur'
		when 'kuala lumpur' then 'Wilayah Persekutuan Kuala Lumpur'
		when 'kl' then 'Wilayah Persekutuan Kuala Lumpur'
		when 'wp kuala lumpur' then 'Wilayah Persekutuan Kuala Lumpur'
		when 'wilayah persekutuan labuan' then 'Wilayah Persekutuan Labuan'
		when 'labuan' then 'Wilayah Persekutuan Labuan'
		when 'wp labuan' then 'Wilayah Persekutuan Labuan'
		when 'wilayah persekutuan putrajaya' then 'Wilayah Persekutuan Putrajaya'
		when 'putrajaya' then 'Wilayah Persekutuan Putrajaya'
		when 'wp putrajaya' then 'Wilayah Persekutuan Putrajaya'
		else null
	end
)::malaysian_state;

alter table leads drop column state;
alter table leads rename column state_new to state;

-- LEAD_SOURCE -> fixed enum ------------------------------------------------
create type lead_source_enum as enum (
	'Meta Ads', 'Google Ads', 'Threads', 'Referral', 'Direct Approach', 'WhatsApp', 'Other'
);

alter table leads add column lead_source_new lead_source_enum;

-- Existing values mix source AND product (e.g. "FB Ads — Medical Card").
-- Best-effort keyword match on the source part only; null stays null
-- (no source recorded at all, different from "Other" = recorded but
-- doesn't fit a category); anything non-null and unmatched -> 'Other'.
update leads set lead_source_new = (
	case
		when lead_source is null then null
		when lower(lead_source) like '%fb ads%' then 'Meta Ads'
		when lower(lead_source) like '%facebook%' then 'Meta Ads'
		when lower(lead_source) like '%meta%' then 'Meta Ads'
		when lower(lead_source) like '%instagram%' then 'Meta Ads'
		when lower(lead_source) like '%google%' then 'Google Ads'
		when lower(lead_source) like '%thread%' then 'Threads'
		when lower(lead_source) like '%referral%' then 'Referral'
		when lower(lead_source) like '%direct%' then 'Direct Approach'
		when lower(lead_source) like '%walk-in%' then 'Direct Approach'
		when lower(lead_source) like '%walk in%' then 'Direct Approach'
		when lower(lead_source) like '%whatsapp%' then 'WhatsApp'
		else 'Other'
	end
)::lead_source_enum;

alter table leads drop column lead_source;
alter table leads rename column lead_source_new to lead_source;
