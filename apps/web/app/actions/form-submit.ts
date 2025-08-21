"use server";

import { createClient } from "@supabase/supabase-js";

interface FormSubmissionData {
  formData: Record<string, string | boolean | number | null>;
  additionalData: Record<string, string | boolean | number | null>;
  domain: string;
}

// Initialize Supabase server client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_SECRET!;

const supabaseServer = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function formSubmit(data: FormSubmissionData) {
  try {
    const { formData, additionalData, domain } = data;

    const { data: appData } = await supabaseServer
      .from("app_domains")
      .select("app")
      .or(`domain.eq.${domain},subdomain.eq.${domain}`)
      .single();
    const app = appData?.app;

    // * If app not found
    if (!app) return { success: false };

    const formSubmission = {
      app: app,
      formName: formData.formName,
      formData: formData,
      additionalData: additionalData,
      pageUrl: additionalData.pageUrl,
    };
    await supabaseServer.from("app_form_submissions").insert(formSubmission);

    return { success: true };
  } catch {
    return { success: false };
  }
}
