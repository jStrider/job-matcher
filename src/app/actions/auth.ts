"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { headers } from "next/headers";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function registerUser(formData: FormData) {
  const ip = await getClientIp();
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return { error: "Trop de tentatives. Réessayez dans une minute." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!email || !password) {
    return { error: "Email et mot de passe requis" };
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { error: "Format d'email invalide" };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }

  if (password.length > 128) {
    return { error: "Mot de passe trop long" };
  }

  if (name && name.length > 200) {
    return { error: "Nom trop long" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email" };
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, password: hashed, name: name || null },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Erreur lors de la connexion" };
    }
    throw error;
  }

  redirect("/profile");
}

export async function loginUser(formData: FormData) {
  const ip = await getClientIp();
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return { error: "Trop de tentatives. Réessayez dans une minute." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email et mot de passe requis" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect" };
    }
    throw error;
  }

  redirect("/dashboard");
}
