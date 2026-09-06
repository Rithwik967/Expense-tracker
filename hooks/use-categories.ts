"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { useMutation } from "@/hooks/use-mutation";
import { api } from "@/lib/api/client";

/**
 * Category management.
 *
 * There is no delete. A category referenced by even one historical transaction
 * cannot be removed without rewriting the past, so retiring it sets
 * `is_active = false`: it disappears from the pickers while every transaction
 * already recorded against it keeps its label.
 */
export function useCategoryActions() {
  const { refresh } = useAppData();

  const create = useMutation(async (body: unknown) => {
    const created = await api.createCategory(body);
    refresh();
    return created;
  });

  const update = useMutation(async (id: string, body: unknown) => {
    const updated = await api.updateCategory(id, body);
    refresh();
    return updated;
  });

  const reorder = useMutation(async (orderedIds: readonly string[]) => {
    const result = await api.reorderCategories(orderedIds);
    refresh();
    return result;
  });

  return { create, update, reorder };
}
