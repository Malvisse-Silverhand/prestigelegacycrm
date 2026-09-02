-- Renames the WA Flow placeholder tokens from the original {{tokXxx}} form to
-- plain readable names, matching the format requested: {{Name}}, {{Agent}},
-- {{Product}}, {{Contribution}}, {{Limit}}.
--
-- The original seed migration (20260830140000) already ran and inserted rows
-- using the old tokens -- editing that file now would not touch the rows it
-- already created, so this is a new migration that rewrites the `body` text
-- of every existing template in place. Order matters: {{tokNama}} must be
-- replaced before a hypothetical bare {{tok...}} collision, but since each
-- old token is distinct there's no overlap to worry about.

update wa_templates set body =
  replace(
    replace(
      replace(
        replace(
          replace(body, '{{tokNama}}', '{{Name}}'),
          '{{tokAgent}}', '{{Agent}}'
        ),
        '{{tokProduk}}', '{{Product}}'
      ),
      '{{tokCaruman}}', '{{Contribution}}'
    ),
    '{{tokHad}}', '{{Limit}}'
  )
where body like '%{{tok%';
