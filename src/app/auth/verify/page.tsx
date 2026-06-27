import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = { title: "Подтверждение email — MyCamDesk" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyResult success={false} message="Токен не указан." />;
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record) {
    return <VerifyResult success={false} message="Ссылка недействительна или уже использована." />;
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return <VerifyResult success={false} message="Срок действия ссылки истёк. Зарегистрируйтесь повторно." />;
  }

  await prisma.user.updateMany({
    where: { email: record.identifier, emailVerified: null },
    data: { emailVerified: new Date() }
  });

  await prisma.verificationToken.delete({ where: { token } }).catch(() => null);

  return <VerifyResult success message="Email подтверждён! Перенаправляем в кабинет..." />;
}

function VerifyResult({ success, message }: { success: boolean; message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
        <div className={`text-5xl mb-4 ${success ? "text-green-500" : "text-red-500"}`}>
          {success ? "✓" : "✗"}
        </div>
        <p className="text-lg text-zinc-800 mb-6">{message}</p>
        {success && (
          <meta httpEquiv="refresh" content="3;url=/cabinet" />
        )}
        <a href={success ? "/cabinet" : "/auth/signup"} className="inline-block bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
          {success ? "Перейти в кабинет" : "Регистрация"}
        </a>
      </div>
    </main>
  );
}
