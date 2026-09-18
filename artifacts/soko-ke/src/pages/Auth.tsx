import { SignIn, SignUp } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Link } from "wouter";

const appearance = {
  theme: shadcn,
  variables: {
    colorPrimary: "#0f766e",
    colorForeground: "#18211f",
    colorMutedForeground: "#64706c",
    colorBackground: "#fffdf8",
    colorInput: "#ffffff",
    colorInputForeground: "#18211f",
    colorNeutral: "#d9e1dc",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    cardBox: "bg-[#fffdf8] rounded-2xl w-[440px] max-w-full shadow-xl overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent",
    footer: "!shadow-none !border-0 !bg-transparent",
    headerTitle: "text-[#18211f] font-serif",
    headerSubtitle: "text-[#64706c]",
    formFieldLabel: "text-[#18211f]",
    footerActionLink: "text-[#0f766e]",
    footerActionText: "text-[#64706c]",
    dividerText: "text-[#64706c]",
    formButtonPrimary: "bg-[#0f766e] hover:bg-[#115e59] text-white",
    formFieldInput: "border-[#d9e1dc] focus:border-[#0f766e]",
    socialButtonsBlockButtonText: "text-[#18211f]",
  },
};

export const localization = {
  signIn: {
    start: {
      title: "Sign in to SokoKE",
      subtitle: "Access your merchant tools and marketplace account",
    },
  },
  signUp: {
    start: {
      title: "Join SokoKE",
      subtitle: "Shop and grow your business across Kenya",
    },
  },
};

function AuthFrame({ children }: { children: React.ReactNode }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <main className="min-h-[100dvh] bg-[#f5f7f2] flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 font-serif text-3xl font-bold text-primary">
        Soko<span className="text-foreground">KE</span>
      </Link>
      {children}
    </main>
  );
}

export function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={appearance} /></AuthFrame>;
}

export function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={appearance} /></AuthFrame>;
}