import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 만약 이미 닉네임이 있다면 홈으로
  const { data: profile } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', user.id)
    .single();

  if (profile?.nickname) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      
      <div className="relative z-10 w-full max-w-md">
        <OnboardingForm user={user} />
      </div>
    </div>
  );
}
