"use client";
import { HomeSmall } from "components/Icons/HomeSmall";
import { Header } from "components/PageHeader";

export const HomeHeader = () => {
  return (
    <div className="font-bold text-secondary flex gap-2 items-center">
      <HomeSmall /> Home
    </div>
  );
};
