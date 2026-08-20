import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'invite',
  email: 'shanilmelder@gmail.com',
  options: { redirectTo: 'shifttracker://reset-password' },
});

if (error) {
  console.error(error);
  process.exit(1);
}
console.log(data.properties.action_link);
