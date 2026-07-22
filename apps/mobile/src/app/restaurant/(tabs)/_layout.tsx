import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function RestaurantLayout() {
  return (
    <NativeTabs tintColor="#16A34A">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag.fill" md="shopping_bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant_menu" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>Analytics</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="analytics" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
