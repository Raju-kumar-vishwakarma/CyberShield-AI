CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_name text NOT NULL,
    content text NOT NULL,
    is_ai boolean DEFAULT false NOT NULL,
    auto_delete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_breach_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_breach_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    is_breached boolean DEFAULT false,
    breach_count integer DEFAULT 0,
    breach_sources text[],
    last_checked_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_analysis text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: honeypot_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.honeypot_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    ip_address text NOT NULL,
    username text,
    location text,
    user_agent text,
    severity text DEFAULT 'warning'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.honeypot_logs REPLICA IDENTITY FULL;


--
-- Name: network_threats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.network_threats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_ip text NOT NULL,
    destination text NOT NULL,
    protocol text NOT NULL,
    bytes_transferred text,
    threat_type text,
    severity text DEFAULT 'low'::text NOT NULL,
    confidence numeric(5,2) DEFAULT 0,
    ai_analysis text,
    status text DEFAULT 'detected'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: phishing_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phishing_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_preview text,
    status text DEFAULT 'pending'::text NOT NULL,
    confidence numeric(5,2) DEFAULT 0,
    threat_indicators jsonb DEFAULT '[]'::jsonb,
    ai_analysis text,
    detected_urls text[],
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    job_title text,
    company text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ssl_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ssl_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    is_valid boolean DEFAULT false,
    issuer text,
    expires_at timestamp with time zone,
    grade text,
    vulnerabilities text[],
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: steel_security_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steel_security_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    final_url text,
    redirect_chain jsonb DEFAULT '[]'::jsonb,
    screenshot_base64 text,
    page_title text,
    has_login_form boolean DEFAULT false,
    has_password_field boolean DEFAULT false,
    has_credit_card_field boolean DEFAULT false,
    suspicious_scripts jsonb DEFAULT '[]'::jsonb,
    external_links jsonb DEFAULT '[]'::jsonb,
    ssl_valid boolean,
    risk_score integer,
    risk_level text,
    ai_analysis text,
    threat_indicators jsonb DEFAULT '[]'::jsonb,
    dom_analysis jsonb DEFAULT '{}'::jsonb,
    scanned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT steel_security_scans_risk_level_check CHECK ((risk_level = ANY (ARRAY['safe'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: suspicious_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    location text,
    attempt_count integer DEFAULT 1 NOT NULL,
    severity text DEFAULT 'low'::text NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: threat_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    threat_type text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    severity text DEFAULT 'low'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    description text,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: email_breach_checks email_breach_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_breach_checks
    ADD CONSTRAINT email_breach_checks_pkey PRIMARY KEY (id);


--
-- Name: honeypot_logs honeypot_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.honeypot_logs
    ADD CONSTRAINT honeypot_logs_pkey PRIMARY KEY (id);


--
-- Name: network_threats network_threats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_threats
    ADD CONSTRAINT network_threats_pkey PRIMARY KEY (id);


--
-- Name: phishing_scans phishing_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phishing_scans
    ADD CONSTRAINT phishing_scans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: ssl_checks ssl_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ssl_checks
    ADD CONSTRAINT ssl_checks_pkey PRIMARY KEY (id);


--
-- Name: steel_security_scans steel_security_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steel_security_scans
    ADD CONSTRAINT steel_security_scans_pkey PRIMARY KEY (id);


--
-- Name: suspicious_ips suspicious_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_ips
    ADD CONSTRAINT suspicious_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: suspicious_ips suspicious_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_ips
    ADD CONSTRAINT suspicious_ips_pkey PRIMARY KEY (id);


--
-- Name: threat_analytics threat_analytics_date_threat_type_severity_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_analytics
    ADD CONSTRAINT threat_analytics_date_threat_type_severity_key UNIQUE (date, threat_type, severity);


--
-- Name: threat_analytics threat_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_analytics
    ADD CONSTRAINT threat_analytics_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_activity_logs Allow anonymous activity logging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous activity logging" ON public.user_activity_logs FOR INSERT WITH CHECK ((user_id IS NULL));


--
-- Name: chat_messages Allow public delete chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete chat_messages" ON public.chat_messages FOR DELETE USING (true);


--
-- Name: network_threats Allow public insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert" ON public.network_threats FOR INSERT WITH CHECK (true);


--
-- Name: chat_messages Allow public insert chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);


--
-- Name: honeypot_logs Allow public insert honeypot_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert honeypot_logs" ON public.honeypot_logs FOR INSERT WITH CHECK (true);


--
-- Name: phishing_scans Allow public insert phishing_scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert phishing_scans" ON public.phishing_scans FOR INSERT WITH CHECK (true);


--
-- Name: suspicious_ips Allow public insert suspicious_ips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert suspicious_ips" ON public.suspicious_ips FOR INSERT WITH CHECK (true);


--
-- Name: threat_analytics Allow public insert threat_analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert threat_analytics" ON public.threat_analytics FOR INSERT WITH CHECK (true);


--
-- Name: network_threats Allow public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access" ON public.network_threats FOR SELECT USING (true);


--
-- Name: chat_messages Allow public read chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);


--
-- Name: honeypot_logs Allow public read honeypot_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read honeypot_logs" ON public.honeypot_logs FOR SELECT USING (true);


--
-- Name: phishing_scans Allow public read phishing_scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read phishing_scans" ON public.phishing_scans FOR SELECT USING (true);


--
-- Name: suspicious_ips Allow public read suspicious_ips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read suspicious_ips" ON public.suspicious_ips FOR SELECT USING (true);


--
-- Name: threat_analytics Allow public read threat_analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read threat_analytics" ON public.threat_analytics FOR SELECT USING (true);


--
-- Name: network_threats Allow public update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update" ON public.network_threats FOR UPDATE USING (true);


--
-- Name: suspicious_ips Allow public update suspicious_ips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update suspicious_ips" ON public.suspicious_ips FOR UPDATE USING (true);


--
-- Name: threat_analytics Allow public update threat_analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update threat_analytics" ON public.threat_analytics FOR UPDATE USING (true);


--
-- Name: user_activity_logs Allow reading anonymous logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow reading anonymous logs" ON public.user_activity_logs FOR SELECT USING ((user_id IS NULL));


--
-- Name: email_breach_checks Anyone can insert breach checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert breach checks" ON public.email_breach_checks FOR INSERT WITH CHECK (true);


--
-- Name: ssl_checks Anyone can insert ssl checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert ssl checks" ON public.ssl_checks FOR INSERT WITH CHECK (true);


--
-- Name: steel_security_scans Anyone can insert steel scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert steel scans" ON public.steel_security_scans FOR INSERT WITH CHECK (true);


--
-- Name: email_breach_checks Anyone can view breach checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view breach checks" ON public.email_breach_checks FOR SELECT USING (true);


--
-- Name: ssl_checks Anyone can view ssl checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view ssl checks" ON public.ssl_checks FOR SELECT USING (true);


--
-- Name: steel_security_scans Anyone can view steel scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view steel scans" ON public.steel_security_scans FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: user_activity_logs Users can insert their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity logs" ON public.user_activity_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_activity_logs Users can view their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: email_breach_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_breach_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: honeypot_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.honeypot_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: network_threats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.network_threats ENABLE ROW LEVEL SECURITY;

--
-- Name: phishing_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phishing_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: ssl_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ssl_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: steel_security_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.steel_security_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: suspicious_ips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suspicious_ips ENABLE ROW LEVEL SECURITY;

--
-- Name: threat_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.threat_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;