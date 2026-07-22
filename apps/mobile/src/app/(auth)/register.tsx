import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@food-delivery/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { z } from "zod";

import Form from "@/components/form/form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import type { SelectOption } from "@/components/ui/select";
import { useAuth } from "@/context/auth.context";
import { getErrorMessage } from "@/lib/get-error-message";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(UserRole),
});

type RegisterForm = z.infer<typeof registerSchema>;

const ROLE_OPTIONS: SelectOption<UserRole>[] = [
  {
    value: UserRole.CUSTOMER,
    label: "Customer",
    icon: <Ionicons name="person-outline" size={20} color="#111827" />,
  },
  {
    value: UserRole.RESTAURANT_OWNER,
    label: "Restaurant",
    icon: <Ionicons name="restaurant-outline" size={20} color="#111827" />,
  },
  {
    value: UserRole.DRIVER,
    label: "Driver",
    icon: <Ionicons name="car-outline" size={20} color="#111827" />,
  },
];

const RegisterScreen = () => {
  const { register } = useAuth();

  const methods = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: UserRole.CUSTOMER,
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterForm) =>
      register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      }),
    // Navigation is handled by the protected stack once `user` is set.
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const onSubmit = methods.handleSubmit((values) =>
    registerMutation.mutate(values),
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-black">
              Create account
            </Text>
            <Text className="mt-2 text-base text-gray-500">
              Sign up to get started.
            </Text>
          </View>

          <Form {...methods}>
            <FormField
              control={methods.control}
              name="role"
              label="I am a"
              fieldType="select"
              options={ROLE_OPTIONS}
            />
            <FormField
              control={methods.control}
              name="firstName"
              label="First name"
              placeholder="Jane"
              autoCapitalize="words"
              className="mt-5"
            />
            <FormField
              control={methods.control}
              name="lastName"
              label="Last name"
              placeholder="Doe"
              autoCapitalize="words"
              className="mt-5"
            />
            <FormField
              control={methods.control}
              name="email"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="mt-5"
            />
            <FormField
              control={methods.control}
              name="password"
              label="Password"
              fieldType="password"
              placeholder="At least 8 characters"
              className="mt-5"
            />

            <Button
              label="Create account"
              loading={registerMutation.isPending}
              onPress={() => {
                void onSubmit();
              }}
              className="mt-6"
            />
          </Form>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-500">Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text className="font-semibold text-black">Log in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
