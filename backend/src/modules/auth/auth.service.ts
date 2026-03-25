import bcrypt from "bcryptjs";
import { supabase } from "@/config/supabase";
import { signAccessToken } from "@/config/jwt";
import type { LoginInput, RegisterInput } from "./auth.schema";

export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const { data: inserted, error } = await supabase
    .from("app_users")
    .insert({
      email: input.email,
      password_hash: passwordHash,
      full_name: input.fullName,
      sex: input.sex,
      lesion_level: input.lesionLevel,
      bladder_management_type: input.bladderManagementType,
      has_caregiver: input.hasCaregiver,
      role: input.role
    })
    .select("id,email,role")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return inserted;
}

export async function loginUser(input: LoginInput) {
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id,email,password_hash,role")
    .eq("email", input.email)
    .maybeSingle();

  if (error) {
    throw new Error(`Auth service unavailable: ${error.message}`);
  }

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });

  return { accessToken };
}
