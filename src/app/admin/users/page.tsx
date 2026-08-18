"use client";

import { useState } from "react";
import { promoteUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AdminUsersPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const result = await promoteUser(phone);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("success");
        setMessage("User promoted to admin successfully!");
        setPhone("");
      }
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/listings" className="text-sm font-medium text-text-muted hover:text-text-main">
          &larr; Back to Admin
        </Link>
        <h1 className="text-2xl font-bold font-heading text-text-main">Manage Admins</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h2 className="font-semibold text-text-main mb-4">Promote Field Member</h2>
        <p className="text-sm text-text-muted mb-6">
          Enter a user&apos;s phone number to grant them access to this admin dashboard. They must have logged in at least once as a student.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Phone Number</label>
            <Input 
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={status === "loading"}
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600 font-medium">{message}</p>
          )}

          {status === "success" && (
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg font-medium">{message}</p>
          )}

          <Button type="submit" disabled={status === "loading" || !phone} className="w-full bg-primary-strong hover:bg-primary-hover text-white">
            {status === "loading" ? "Promoting..." : "Promote to Admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}
