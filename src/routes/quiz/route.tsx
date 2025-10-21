import ContentAction from "@/components/timer/actions/ContentAction";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

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
        <>
          <div className="wide:max-w-1/3 absolute top-16 left-16 z-20 w-full 2xl:max-w-[30%]">
            <ContentAction
              variant="big"
              content="Each table representative must connect to the quiz"
              lang="en"
              flagPosition="left"
            />
          </div>
          <div className="wide:max-w-1/3 absolute top-16 right-16 z-20 w-full 2xl:max-w-[30%]">
            <ContentAction
              variant="big"
              content="Cada representante de mesa deve se conectar ao quiz"
              lang="br"
              flagPosition="right"
            />
          </div>
          <div className="wide:max-w-1/3 absolute bottom-16 left-16 z-20 w-full 2xl:max-w-[30%]">
            <ContentAction
              variant="big"
              content="Chaque représentant de table doit se connecter au quiz"
              lang="fr"
              flagPosition="left"
            />
          </div>
        </>
        <div className="relative z-20 flex h-screen flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2 text-gray-200 dark:text-gray-200">
            <div className="wide:max-w-2xl mt-8 max-w-md">
              <img
                className="block w-full"
                src="/assets/qrcode/quiz-qr-code.png"
                alt=""
              />
            </div>
          </div>
          <div className="group absolute right-0 bottom-0 z-50 p-4">
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
