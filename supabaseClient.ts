// файл supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pbbllwseooiwzvvrkvno.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYmxsd3Nlb29pd3p2dnJrdm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzM0OTgsImV4cCI6MjA4NjU0OTQ5OH0.aqSGPsOmjqXAaSotgSEobF8--VclziJLjSzLYk1SAV8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);