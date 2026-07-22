import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { Pressable, Text, View } from "react-native";

export interface BottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface BottomSheetProps {
  /** Heading shown at the top of the sheet. */
  title?: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Called when the sheet is dismissed (swipe-down, backdrop tap, or close). */
  onDismiss?: () => void;
  /** Wrap content in a scroll view (default true). Set false for short content. */
  scrollable?: boolean;
}

/**
 * Reusable bottom sheet built on `@gorhom/bottom-sheet`.
 *
 * Present/dismiss imperatively via the ref:
 *   const sheet = useRef<BottomSheetRef>(null);
 *   sheet.current?.present();
 *
 * Requires `<BottomSheetModalProvider>` at the app root (already wired in
 * `app/_layout.tsx`). Auto-sizes to its content and handles the keyboard.
 */
export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet(
    { title, subtitle, children, onDismiss, scrollable = true },
    ref,
  ) {
    const modalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => modalRef.current?.present(),
      dismiss: () => modalRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    const Container = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheetModal
        ref={modalRef}
        onDismiss={onDismiss}
        enableDynamicSizing
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
        backgroundStyle={{ borderRadius: 24 }}
      >
        <Container>
          <View className="px-6 pb-10">
            {(title || subtitle) && (
              <View className="mb-5 flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  {title && (
                    <Text className="text-2xl font-bold text-black">
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text className="mt-1 text-sm text-gray-500">
                      {subtitle}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => modalRef.current?.dismiss()}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                  <Ionicons name="close" size={20} color="#111827" />
                </Pressable>
              </View>
            )}
            {children}
          </View>
        </Container>
      </BottomSheetModal>
    );
  },
);
