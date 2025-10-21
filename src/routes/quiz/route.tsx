import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";

export const Route = createFileRoute("/quiz")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <section className="h-screen w-full overflow-hidden">
      <article>
        <video
          src="/assets/videos/universe.mp4"
          autoPlay
          muted
          loop
          className="absolute top-0 left-0 z-0 h-full w-full object-cover"
          id="background-video"
        ></video>
        <div className="absolute top-0 left-0 z-10 h-full w-full bg-black/70"></div>
        <div className="relative z-20 flex h-screen flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2 text-gray-200 dark:text-gray-200">
            <MonitorPlay className="size-12" />
            <h1 className="text-8xl">Join the quiz</h1>
            <div className="mt-8 max-w-lg">
              <img src="/assets/qrcode/qr-code.png" alt="" />
            </div>
          </div>
          <div className="group absolute top-0 right-0 z-50 p-4">
            <Button
              onClick={() =>
                navigate({
                  to: "/",
                })
              }
              variant="secondary"
            >
              Go to back to Timer
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}
