import StatusBadge from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTimerById, updateTimer } from "@/lib/actions/timer.action";
import { UpdateTimer } from "@/lib/db/schema/timer.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { serialize } from "superjson";
import { z } from "zod";

const updateTimerSchema = z.object({
  name: z.string().min(1, "Timer name is required"),
  scheduledStartTime: z.string().optional(),
  durationMinutes: z.number().min(0, "Duration must be positive"),
  cascadeUpdate: z.boolean(),
});

const timerQueryOptions = (timerId: string) =>
  queryOptions({
    queryKey: ["timer", timerId],
    queryFn: () => getTimerById({ data: { id: timerId } }),
  });

type UpdateTimerForm = z.infer<typeof updateTimerSchema>;

export const Route = createFileRoute("/(authenticated)/dashboard/timers/$timerId/")({
  component: RouteComponent,
  loader: async ({ params: { timerId }, context }) => {
    const data = await context.queryClient.ensureQueryData(timerQueryOptions(timerId));
    return data;
  },
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const { timerId } = Route.useParams();
  const { data: timer, isLoading } = useQuery(timerQueryOptions(timerId));
  const navigate = Route.useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const userTimerMutation = useMutation({
    mutationFn: async (
      data: UpdateTimer & {
        cascadeUpdate?: boolean;
        originalDurationMinutes?: number;
      },
    ) => {
      const transformedData = serialize(data);
      return await updateTimer({ data: { ...transformedData, id: timerId } });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<UpdateTimerForm>({
    resolver: zodResolver(updateTimerSchema),
    defaultValues: {
      name: "",
      scheduledStartTime: "",
      durationMinutes: 0,
      cascadeUpdate: false,
    },
  });

  // Populate form when timer data is loaded
  useEffect(() => {
    if (timer) {
      console.log(timer.scheduledStartTime?.toISOString());

      reset({
        name: timer.name,
        scheduledStartTime:
          timer.scheduledStartTime?.toISOString().slice(0, 16) || undefined,
        durationMinutes: timer.durationMinutes || 0,
        cascadeUpdate: false,
      });
    }
  }, [timer, reset]);

  const onSubmit = async (data: UpdateTimerForm) => {
    try {
      const scheduledStartTime = data.scheduledStartTime
        ? new Date(data.scheduledStartTime)
        : null;

      userTimerMutation.mutate({
        id: timerId,
        name: data.name,
        scheduledStartTime: scheduledStartTime,
        durationMinutes: data.durationMinutes,
        lastModifiedById: user.id,
        updatedAt: new Date(),
        cascadeUpdate: data.cascadeUpdate,
        originalDurationMinutes: timer?.durationMinutes || 0,
      });

      // Navigate back to dashboard on success
      if (canGoBack) {
        router.history.back();
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while updating the timer",
      });
    }
  };

  if (!timer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">Timer not found</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <StatusBadge status={timer.status} />
          <CardTitle>Edit Timer: {timer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errors.root && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {errors.root.message}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Timer Name
              </label>
              <Input
                id="name"
                type="text"
                {...register("name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Scheduled Start Time */}
            <div className="space-y-2">
              <label
                htmlFor="scheduledStartTime"
                className="block text-sm font-medium text-gray-700"
              >
                Scheduled Start Time
              </label>
              <Input
                id="scheduledStartTime"
                type="datetime-local"
                {...register("scheduledStartTime")}
                className={errors.scheduledStartTime ? "border-red-500" : ""}
              />
              {errors.scheduledStartTime && (
                <p className="text-sm text-red-600">
                  {errors.scheduledStartTime.message}
                </p>
              )}
            </div>

            {/* Duration Minutes */}
            <div className="space-y-2">
              <label
                htmlFor="durationMinutes"
                className="block text-sm font-medium text-gray-700"
              >
                Duration (minutes)
              </label>
              <Input
                id="durationMinutes"
                type="number"
                min="0"
                {...register("durationMinutes", {
                  valueAsNumber: true,
                })}
                className={errors.durationMinutes ? "border-red-500" : ""}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-red-600">{errors.durationMinutes.message}</p>
              )}
            </div>

            {/* Cascade Update Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                id="cascadeUpdate"
                type="checkbox"
                {...register("cascadeUpdate")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="cascadeUpdate"
                className="text-sm font-medium text-gray-700"
              >
                Update following timers in cascade
                <span className="mt-1 block text-xs text-gray-500">
                  If duration changes, shift all subsequent timers by the difference
                </span>
              </label>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (canGoBack) {
                    router.history.back();
                  } else {
                    navigate({ to: "/dashboard" });
                  }
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
