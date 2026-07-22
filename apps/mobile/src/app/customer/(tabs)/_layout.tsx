import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function CustomerTabsLayout() {
  return (
    <NativeTabs tintColor="#16A34A">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cart.fill" md="shopping_cart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag.fill" md="receipt_long" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
