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
import { useAuth } from "@/context/auth.context";
import { getErrorMessage } from "@/lib/get-error-message";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginScreen = () => {
  const { login } = useAuth();

  const methods = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginForm) => login(values.email.trim(), values.password),
    // Navigation is handled by the protected stack once `user` is set.
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const onSubmit = methods.handleSubmit((values) => loginMutation.mutate(values));

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
            <Text className="text-3xl font-bold text-black">Welcome back</Text>
            <Text className="mt-2 text-base text-gray-500">
              Log in to continue ordering.
            </Text>
          </View>

          <Form {...methods}>
            <FormField
              control={methods.control}
              name="email"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <FormField
              control={methods.control}
              name="password"
              label="Password"
              fieldType="password"
              placeholder="Enter your password"
              className="mt-5"
            />

            <Button
              label="Log in"
              loading={loginMutation.isPending}
              onPress={() => {
                void onSubmit();
              }}
              className="mt-6"
            />
          </Form>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-500">Don&apos;t have an account? </Text>
            <Link href="/(auth)/register">
              <Text className="font-semibold text-black">Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
