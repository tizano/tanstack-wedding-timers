import { startWeddingDemo } from "@/lib/actions/timer.action";
import { MUTATION_KEYS } from "@/lib/constant/constant";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";

function EnableDemoButton() {
  const navigate = useNavigate();
  const now = new Date();
  const clientLocalDate = now.toISOString();
  const clientTimezoneOffset = now.getTimezoneOffset(); // Offset en minutes (positif si en retard sur UTC)
  console.log("[ClientDate] -- ", clientLocalDate);
  console.log("[ClientTimezoneOffset] -- ", clientTimezoneOffset, "minutes");

  const { mutate, isPending, isSuccess } = useMutation({
    mutationKey: [MUTATION_KEYS.START_WEDDING_DEMO],
    mutationFn: async () => {
      return await startWeddingDemo({
        data: {
          weddingEventId: "wedding-event-demo",
          weddingEventIdToCopyFrom: "wedding-event-1",
          clientLocalDate: clientLocalDate,
          clientTimezoneOffset: clientTimezoneOffset,
        },
      });
    },
    onSuccess() {
      navigate({
        to: "/dashboard/$weddingEventId",
        params: { weddingEventId: "wedding-event-demo" },
      });
    },
  });
  const handleClickDemoMode = () => {
    mutate();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClickDemoMode}
        variant={"destructive"}
        className="cursor-pointer"
        disabled={isPending || isSuccess}
      >
        Enable Demo Mode
        {isPending && " (Starting...)"}
        {isSuccess && " (Enabled)"}
      </Button>
      {isPending && <span>Updating all demo timers...</span>}
    </div>
  );
}
export default EnableDemoButton;
