"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@ws/ui/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@ws/ui/components/ui/radio-group";
import type {
  BroadcastFormInstance,
  BroadcastFormTranslationFn,
} from "./form-create.types";

interface DeliveryModeFieldProps {
  tbf: BroadcastFormTranslationFn;
  form: BroadcastFormInstance;
}

export function DeliveryModeField({ tbf, form }: DeliveryModeFieldProps) {
  const deliveryModeError = form.formState.errors.deliveryMode?.message;

  return (
    <FieldSet>
      <FieldLabel>{tbf("delivery")}</FieldLabel>
      <RadioGroup
        value={form.watch("deliveryMode")}
        onValueChange={(value) => {
          form.setValue("deliveryMode", value as "push_only" | "push_and_save", {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <FieldLabel htmlFor="delivery-push-and-save">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{tbf("deliveryPushAndSaveTitle")}</FieldTitle>
              <FieldDescription>{tbf("deliveryPushAndSaveHint")}</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="push_and_save" id="delivery-push-and-save" />
          </Field>
        </FieldLabel>

        <FieldLabel htmlFor="delivery-push-only">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{tbf("deliveryPushOnlyTitle")}</FieldTitle>
              <FieldDescription>{tbf("deliveryPushOnlyHint")}</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="push_only" id="delivery-push-only" />
          </Field>
        </FieldLabel>
      </RadioGroup>
      <FieldError errors={[{ message: deliveryModeError }]} />
    </FieldSet>
  );
}
