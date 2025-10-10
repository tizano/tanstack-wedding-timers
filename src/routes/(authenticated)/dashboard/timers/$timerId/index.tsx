import StatusBadge from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTimerById, updateTimer } from "@/lib/actions/timer.action";
import { UpdateTimer } from "@/lib/db/schema/timer.schema";
import { convertToTimezoneAgnosticDate } from "@/lib/utils";
import { DevTool } from "@hookform/devtools";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
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
    queryFn: async () => (await getTimerById({ data: { id: timerId } })) || null,
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
  const { user, queryClient } = Route.useRouteContext();
  const { timerId } = Route.useParams();
  const { data: timer } = useSuspenseQuery(timerQueryOptions(timerId));
  const navigate = Route.useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const { mutate: timerMutation, isPending } = useMutation({
    mutationFn: async (
      data: UpdateTimer & {
        cascadeUpdate?: boolean;
        originalDurationMinutes?: number;
      },
    ) => {
      console.log("Submitting with scheduledStartTime:", data);

      return await updateTimer({
        data: {
          ...data,
          id: timerId,
        },
      });
    },
    onSuccess: () => {
      // Navigate back to dashboard on success
      if (canGoBack) {
        router.history.back();
      } else {
        navigate({ to: "/dashboard" });
      }
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["timers"] });
      queryClient.invalidateQueries({ queryKey: ["timer", timerId] });
    },
    onError: (error) => {
      console.error("Failed to update timer:", error);
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while updating the timer",
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setError,
  } = useForm<UpdateTimerForm>({
    resolver: zodResolver(updateTimerSchema),
    mode: "onTouched",
    defaultValues: {
      name: timer?.name || "",
      scheduledStartTime: timer?.scheduledStartTime?.toISOString().slice(0, 16) || "",
      durationMinutes: timer?.durationMinutes || 0,
      cascadeUpdate: false,
    },
  });

  const onSubmit = async (data: UpdateTimerForm) => {
    const scheduledStartTime = data.scheduledStartTime
      ? convertToTimezoneAgnosticDate(new Date(data.scheduledStartTime))
      : null;

    const mutationData = {
      id: timerId,
      name: data.name,
      scheduledStartTime: scheduledStartTime,
      durationMinutes: data.durationMinutes,
      lastModifiedById: user.id,
      updatedAt: new Date(),
      cascadeUpdate: data.cascadeUpdate,
      originalDurationMinutes: timer?.durationMinutes || 0,
    };

    timerMutation(mutationData);
  };

  if (!timer) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Timer Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">The requested timer does not exist.</p>
            <div className="pt-6">
              <Button
                variant="outline"
                onClick={() => {
                  if (canGoBack) {
                    router.history.back();
                  } else {
                    navigate({ to: "/dashboard" });
                  }
                }}
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
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
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
          <DevTool control={control} /> {/* set up the dev tool */}
        </CardContent>
      </Card>
    </div>
  );
}
