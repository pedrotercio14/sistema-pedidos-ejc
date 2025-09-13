// supabaseclient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// Substitua com a URL e a chave Anon do seu projeto Supabase
const supabaseUrl = 'https://qjtpeefykdnxvfltopgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdHBlZWZ5a2RueHZmbHRvcGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzU1MzMsImV4cCI6MjA3MzM1MTUzM30.vYzjDhsWMyAYSIL3S2pmDjf9BHKZGyOJnukAUxDF-7M';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;