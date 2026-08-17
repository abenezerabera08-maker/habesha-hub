


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (new.id, 'attendee');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ticket_quantity_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    UPDATE ticket_tiers SET quantity_sold = quantity_sold + NEW.quantity WHERE id = NEW.ticket_tier_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_ticket_quantity_sold"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role = 'admin' FROM profiles WHERE id = uid;
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "interest_id" "uuid" NOT NULL
);


ALTER TABLE "public"."event_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "method_type" "text" NOT NULL,
    "provider" "text",
    "account_name" "text" NOT NULL,
    "account_number" "text" NOT NULL,
    "instructions" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "title" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "event_date" timestamp with time zone,
    "latitude" double precision,
    "longitude" double precision,
    "venue_name" "text",
    "organizer_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "city_id" "uuid",
    "rejection_reason" "text",
    "published_at" timestamp with time zone,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_review'::"text", 'published'::"text", 'rejected'::"text", 'cancelled'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quantity" integer NOT NULL,
    "total_price" numeric NOT NULL,
    "status" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_tier_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tk_code" "text",
    "checked_in_at" timestamp with time zone,
    "checked_in_by" "uuid",
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending_payment'::"text", 'pending_verification'::"text", 'confirmed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_name" "text" NOT NULL,
    "org_description" "text",
    "contact_email" "text" NOT NULL,
    "manager_phone" "text",
    "support_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_proofs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "reference_number" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_proofs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "verified_by" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_verifications_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."payment_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method_id" "uuid",
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" DEFAULT '''attendee''::text'::"text",
    "location" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_tiers" (
    "name" "text" NOT NULL,
    "price" numeric,
    "quantity_available" bigint,
    "quantity_sold" bigint DEFAULT '0'::bigint,
    "event_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text",
    "currency" "text" DEFAULT 'ETB'::"text" NOT NULL,
    "sale_start" timestamp with time zone,
    "sale_end" timestamp with time zone,
    "max_per_order" integer,
    "max_group_size" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "color" "text",
    "benefits" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quantity_sold_not_exceeding_available" CHECK (("quantity_sold" <= "quantity_available")),
    CONSTRAINT "ticket_tiers_color_check" CHECK (("color" = ANY (ARRAY['gold'::"text", 'silver'::"text", 'bronze'::"text", 'blue'::"text", 'green'::"text", 'purple'::"text", 'red'::"text", 'gray'::"text"])))
);


ALTER TABLE "public"."ticket_tiers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."purchasable_ticket_tiers" WITH ("security_invoker"='true') AS
 SELECT "tt"."id",
    "tt"."event_id",
    "tt"."name",
    "tt"."description",
    "tt"."price",
    "tt"."currency",
    "tt"."quantity_available",
    "tt"."quantity_sold",
    ("tt"."quantity_available" - "tt"."quantity_sold") AS "quantity_remaining",
    "tt"."sale_start",
    "tt"."sale_end",
    "tt"."max_per_order",
    "tt"."max_group_size",
    "tt"."color",
    "tt"."benefits",
    "tt"."display_order"
   FROM ("public"."ticket_tiers" "tt"
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
  WHERE (("e"."status" = 'published'::"text") AND ("tt"."is_active" = true) AND ("tt"."quantity_sold" < "tt"."quantity_available") AND (("tt"."sale_start" IS NULL) OR ("tt"."sale_start" <= "now"())) AND (("tt"."sale_end" IS NULL) OR ("tt"."sale_end" >= "now"())));


ALTER VIEW "public"."purchasable_ticket_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interests" (
    "user_id" "uuid" NOT NULL,
    "interest_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_interests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_interests"
    ADD CONSTRAINT "event_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_payment_methods"
    ADD CONSTRAINT "event_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_profiles"
    ADD CONSTRAINT "organizer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_profiles"
    ADD CONSTRAINT "organizer_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."payment_proofs"
    ADD CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_verifications"
    ADD CONSTRAINT "payment_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tiers"
    ADD CONSTRAINT "ticket_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id", "interest_id");



CREATE UNIQUE INDEX "orders_tk_code_key" ON "public"."orders" USING "btree" ("tk_code") WHERE ("tk_code" IS NOT NULL);



CREATE OR REPLACE TRIGGER "orders_increment_quantity_sold" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."increment_ticket_quantity_sold"();



CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ticket_tiers_set_updated_at" BEFORE UPDATE ON "public"."ticket_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."event_interests"
    ADD CONSTRAINT "event_interests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_interests"
    ADD CONSTRAINT "event_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id");



ALTER TABLE ONLY "public"."event_payment_methods"
    ADD CONSTRAINT "event_payment_methods_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "public"."ticket_tiers"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_profiles"
    ADD CONSTRAINT "organizer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_proofs"
    ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."payment_verifications"
    ADD CONSTRAINT "payment_verifications_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."payment_verifications"
    ADD CONSTRAINT "payment_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."event_payment_methods"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_location_fkey" FOREIGN KEY ("location") REFERENCES "public"."cities"("id");



ALTER TABLE ONLY "public"."ticket_tiers"
    ADD CONSTRAINT "ticket_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can update any event" ON "public"."events" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all events" ON "public"."events" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Anyone authenticated can read event_interests" ON "public"."event_interests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view active payment methods" ON "public"."event_payment_methods" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Anyone can view cities" ON "public"."cities" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view event interests" ON "public"."event_interests" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view events" ON "public"."events" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view interests" ON "public"."interests" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view ticket tiers" ON "public"."ticket_tiers" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Attendees can insert payment for their own order" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "payments"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Attendees can insert proof for their own payment" ON "public"."payment_proofs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
  WHERE (("payments"."id" = "payment_proofs"."payment_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Attendees can view their own payment" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "payments"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Attendees can view their own proof" ON "public"."payment_proofs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
  WHERE (("payments"."id" = "payment_proofs"."payment_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Attendees can view verification log for their own orders" ON "public"."payment_verifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
  WHERE (("payments"."id" = "payment_verifications"."payment_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can create events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "organizer_id"));



CREATE POLICY "Organizers can create ticket tiers" ON "public"."ticket_tiers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "ticket_tiers"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can insert their own profile" ON "public"."organizer_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Organizers can insert verification for their events" ON "public"."payment_verifications" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("payments"."id" = "payment_verifications"."payment_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can manage interests for their events" ON "public"."event_interests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_interests"."event_id") AND ("events"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_interests"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can manage payment methods for their own events" ON "public"."event_payment_methods" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_payment_methods"."event_id") AND ("events"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_payment_methods"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can update orders for their events" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "orders"."event_id") AND ("events"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "orders"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can update payments for their events" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders"
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("orders"."id" = "payments"."order_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can update their own events" ON "public"."events" FOR UPDATE TO "authenticated" USING (("organizer_id" = "auth"."uid"())) WITH CHECK (("organizer_id" = "auth"."uid"()));



CREATE POLICY "Organizers can update their own profile" ON "public"."organizer_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Organizers can update ticket tiers for their events" ON "public"."ticket_tiers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "ticket_tiers"."event_id") AND ("events"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "ticket_tiers"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can view orders for their events" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "orders"."event_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can view payments for their events" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders"
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("orders"."id" = "payments"."order_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can view profiles of their attendees" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders"
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("orders"."user_id" = "profiles"."id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can view proof for their events" ON "public"."payment_proofs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("payments"."id" = "payment_proofs"."payment_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Organizers can view their own profile" ON "public"."organizer_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Organizers can view verification log for their events" ON "public"."payment_verifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."payments"
     JOIN "public"."orders" ON (("orders"."id" = "payments"."order_id")))
     JOIN "public"."events" ON (("events"."id" = "orders"."event_id")))
  WHERE (("payments"."id" = "payment_verifications"."payment_id") AND ("events"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own interests" ON "public"."user_interests" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own interests" ON "public"."user_interests" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own interests" ON "public"."user_interests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizer_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_proofs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_interests" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ticket_quantity_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ticket_quantity_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ticket_quantity_sold"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."event_interests" TO "anon";
GRANT ALL ON TABLE "public"."event_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."event_interests" TO "service_role";



GRANT ALL ON TABLE "public"."event_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."event_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."event_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."interests" TO "anon";
GRANT ALL ON TABLE "public"."interests" TO "authenticated";
GRANT ALL ON TABLE "public"."interests" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."organizer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."payment_proofs" TO "anon";
GRANT ALL ON TABLE "public"."payment_proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_proofs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_verifications" TO "anon";
GRANT ALL ON TABLE "public"."payment_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_tiers" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."purchasable_ticket_tiers" TO "anon";
GRANT ALL ON TABLE "public"."purchasable_ticket_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."purchasable_ticket_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."user_interests" TO "anon";
GRANT ALL ON TABLE "public"."user_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interests" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







