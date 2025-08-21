import FormComponent from "@/components/ui/form-component";
import { ChaiBlockComponentProps, ChaiStyles, registerChaiBlockSchema, StylesProp } from "chai-next/blocks";
import * as React from "react";

type ChaiFormProps = {
  successMessage: string;
  errorMessage: string;
  styles: ChaiStyles;
  inBuilder: boolean;
  formName: string;
  children: React.ReactNode;
};

const ChaiForm = (props: ChaiBlockComponentProps<ChaiFormProps>) => {
  return <FormComponent {...props} />;
};

const FormConfig = {
  type: "Form",
  label: "Form",
  category: "core",
  group: "form",
  ...registerChaiBlockSchema({
    properties: {
      styles: StylesProp(""),
      formName: {
        type: "string",
        title: "Form Name",
        default: "Default form",
      },
      successMessage: {
        type: "string",
        title: "Success Message",
        default: "Form submitted successfully.",
        ui: { "ui:widget": "richtext" },
      },
      errorMessage: {
        type: "string",
        title: "Error Message",
        default: "Something went wrong. Please try again.",
        ui: { "ui:widget": "richtext" },
      },
    },
  }),
};

export { ChaiForm, FormConfig };
