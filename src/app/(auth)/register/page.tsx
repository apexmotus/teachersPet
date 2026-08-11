import { RegisterForm } from '@/components/auth/register-form'

type RegisterPageProps = {
  searchParams: Promise<{ confirmation?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { confirmation } = await searchParams
  return <RegisterForm confirmationFailed={confirmation === 'failed'} />
}
