"use client";

import { ChaiStyles } from "chai-next/blocks";
import { useState } from "react";
import { formSubmit } from "../../app/actions/form-submit";

type FormJSON = Record<string, string | boolean | number | null>;

function getFormData(form: HTMLFormElement): FormJSON {
  const result: FormJSON = {};
  const fd = new FormData(form);

  // Include non-file, non-boolean fields from FormData first
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) continue;
    result[k] = v;
  }

  const elements = Array.from(form.elements) as Element[];

  // Group checkbox and radio inputs by name
  const boolGroups = new Map<string, HTMLInputElement[]>();
  for (const el of elements) {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") && el.name) {
      const arr = boolGroups.get(el.name) ?? [];
      arr.push(el);
      boolGroups.set(el.name, arr);
    }
  }

  // For each boolean group, set true if any checked, else false
  for (const [name, group] of boolGroups.entries()) {
    const isChecked = group.some((i) => i.checked);
    result[name] = isChecked;
  }

  return result;
}

const getAdditionalData = () => {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const referrer = typeof window !== "undefined" ? document.referrer : "";
  const pageTitle = typeof window !== "undefined" ? document.title : "";

  return {
    pageUrl,
    referrer,
    pageTitle,
  };
};

const SubmissionResponse = ({
  state,
  successMessage,
  errorMessage,
}: {
  state: string;
  successMessage: string;
  errorMessage: string;
}) => {
  if (state === "" || state === "loading") return null;

  if (state === "success") {
    return <p className="text-green-500">{successMessage}</p>;
  }

  if (state === "error") {
    return <p className="text-red-500">{errorMessage}</p>;
  }
};

const FormComponent = ({
  blockProps,
  styles,
  formName,
  children,
  errorMessage,
  successMessage,
  inBuilder,
}: {
  blockProps: React.HTMLAttributes<HTMLFormElement>;
  styles: ChaiStyles;
  formName: string;
  children: React.ReactNode;
  successMessage: string;
  errorMessage: string;
  inBuilder: boolean;
}) => {
  const [state, setState] = useState("");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (inBuilder) return;
    setState("loading");
    try {
      const form = e.currentTarget;
      const formData = getFormData(form);
      const additionalData = getAdditionalData();
      const result = await formSubmit({ formData, additionalData, domain: window.location.hostname });
      setState(result.success ? "success" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <form
      method="POST"
      onSubmit={handleSubmit}
      {...{ ...styles, className: `relative ${styles?.className}` }}
      {...blockProps}>
      <input type="hidden" value={formName || ""} name="formName" readOnly hidden />
      <fieldset disabled={state === "loading"}>{children as React.ReactNode}</fieldset>
      <SubmissionResponse state={state} successMessage={successMessage} errorMessage={errorMessage} />
    </form>
  );
};

export default FormComponent;
