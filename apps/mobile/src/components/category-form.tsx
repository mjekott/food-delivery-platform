import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Form from "@/components/form/form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: CategoryFormValues) => void;
}

export function CategoryForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: CategoryFormProps) {
  const methods = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  const submit = methods.handleSubmit((values) => onSubmit(values));

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="name"
        label="Category name"
        placeholder="Starters"
        autoCapitalize="words"
      />
      <Button
        label={submitLabel}
        loading={isSubmitting}
        onPress={() => {
          void submit();
        }}
        className="mt-6"
      />
    </Form>
  );
}
