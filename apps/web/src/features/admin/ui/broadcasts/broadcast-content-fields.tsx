"use client";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@ws/ui/components/ui/field";
import { Input } from "@ws/ui/components/ui/input";
import { Textarea } from "@ws/ui/components/ui/textarea";
import type {
  BroadcastFormInstance,
  BroadcastFormTranslationFn,
} from "./form-create.types";

interface BroadcastContentFieldsProps {
  tbf: BroadcastFormTranslationFn;
  form: BroadcastFormInstance;
}

export function BroadcastContentFields({
  tbf,
  form,
}: BroadcastContentFieldsProps) {
  const titleError = form.formState.errors.title?.message;
  const pushUrlError = form.formState.errors.pushUrl?.message;
  const messageError = form.formState.errors.message?.message;

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(titleError)}>
          <FieldLabel htmlFor="broadcast-title">{tbf("titleOptional")}</FieldLabel>
          <Input
            id="broadcast-title"
            placeholder={tbf("titlePlaceholder")}
            className="bg-background"
            aria-invalid={Boolean(titleError)}
            {...form.register("title")}
          />
          <FieldError errors={[{ message: titleError }]} />
        </Field>
        <Field data-invalid={Boolean(pushUrlError)}>
          <FieldLabel htmlFor="broadcast-url">{tbf("pushUrlOptional")}</FieldLabel>
          <Input
            id="broadcast-url"
            placeholder={tbf("pushUrlPlaceholder")}
            className="bg-background font-mono text-sm"
            aria-invalid={Boolean(pushUrlError)}
            {...form.register("pushUrl")}
          />
          <FieldError errors={[{ message: pushUrlError }]} />
        </Field>
      </div>

      <Field data-invalid={Boolean(messageError)}>
        <FieldLabel htmlFor="broadcast-message">{tbf("message")}</FieldLabel>
        <Textarea
          id="broadcast-message"
          placeholder={tbf("messagePlaceholder")}
          rows={5}
          className="bg-background min-h-[120px] resize-y sm:min-h-[140px]"
          aria-invalid={Boolean(messageError)}
          {...form.register("message")}
        />
        <FieldError errors={[{ message: messageError }]} />
      </Field>
    </FieldGroup>
  );
}
