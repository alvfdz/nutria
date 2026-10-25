-- Single-owner guard. `allowOnlyFirstUser` (src/lib/auth/auth.ts) refuses a
-- second account with a count-then-insert, which two sign-ups racing on a
-- fresh install can both pass. This trigger closes that window in the
-- database: the transaction-scoped advisory lock serializes every insert into
-- "users", so the second one sees the first one's committed row and fails.
--
-- Prisma does not manage triggers or functions, so later migrations generated
-- from the schema leave this in place. Drop both when multi-user sign-up
-- ships.

CREATE FUNCTION "nutria_single_owner"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nutria_single_owner'));

  IF EXISTS (SELECT 1 FROM "users") THEN
    RAISE EXCEPTION 'Sign-up is closed: this Nutria instance already has an owner.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_single_owner"
BEFORE INSERT ON "users"
FOR EACH ROW EXECUTE FUNCTION "nutria_single_owner"();
