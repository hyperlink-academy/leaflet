import { theme } from "tailwind.config";
import {
  BigStar1,
  BigStar2,
  BigStar3,
  BigStar4,
  Moon,
  Planet1,
  Planet2,
  Planet3,
  Planet4,
  Sky,
  Star1,
  Star2,
  Star3,
} from "./Stars";
import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";

// TODO
// animate last start coming in (little star gets a tiny sunburst around it maybe?)
// twinkle them slightly?
// every ten stars is a planet

type starType = {
  // S = small stars, LS = large stars, P = planets
  type:
    | "S1"
    | "S2"
    | "S3"
    | "BS1"
    | "BS2"
    | "BS3"
    | "BS4"
    | "P1"
    | "P2"
    | "P3"
    | "P4";
  x: number;
  y: number;
  rot: number;
};

export const PublishIllustration = (props: { posts_in_pub: number }) => {
  let { data: publication } = useLeafletPublicationData();

  let width = 320;
  let height = 256;

  let totalPosts = props.posts_in_pub;
  let numberOfStars = totalPosts % 10;
  let numberOfPlanets = Math.floor(totalPosts / 10);

  let moonPosX = Math.random() * (width - 48 - 82) + 24;
  let moonPosY = Math.random() * (height - 48 - 82) + 24;

  let stars: starType[] = [];
  let planetCounter = { P1: 0, P2: 0, P3: 0, P4: 0 };

  for (let i = 0; i < numberOfStars + numberOfPlanets; i++) {
    let isPlanet = i <= numberOfPlanets;

    function starPosGenerator() {
      const x = Math.random() * (width - 72 - (isPlanet ? 28 : 0)) + 36;
      const y = Math.random() * (height - 72 - (isPlanet ? 28 : 0)) + 36;
      return { x, y };
    }

    let x = starPosGenerator().x;
    let y = starPosGenerator().y;

    // check star distance from each other and from moon
    function hasCollision(x: number, y: number) {
      // Check collision with moon

      let moonDistance = Math.sqrt(
        Math.pow((isPlanet ? x + 14 : x) - (moonPosX + 41), 2) +
          Math.pow((isPlanet ? y + 14 : y) - (moonPosY + 41), 2),
      );
      if (moonDistance < 60) {
        console.log("moon collision!");

        return true;
      }

      // Check collision with existing stars
      for (const star of stars) {
        let starDistance = Math.sqrt(
          Math.pow(x - (isPlanet ? star.x + 14 : star.x), 2) +
            Math.pow(y - (isPlanet ? star.y + 14 : star.y), 2),
        );
        if (starDistance < 40) {
          console.log("star collision!");

          return true;
        }
      }

      return false;
    }

    // keep generating new positions until no collision
    let attempts = 0;
    while (hasCollision(x, y) && attempts < 100) {
      const newPos = starPosGenerator();
      x = newPos.x;
      y = newPos.y;
      attempts++;
    }

    // only add star if we found a valid position
    if (attempts < 100) {
      if (i < numberOfPlanets) {
        let findType = Math.floor(Math.random() * 4);
        let type: "P1" | "P2" | "P3" | "P4" =
          findType === 0
            ? "P1"
            : findType === 1
              ? "P2"
              : findType === 2
                ? "P3"
                : "P4";

        // to ensure even planet usage, check that this planet type is not the most common one
        let maxCount = Math.max(...Object.values(planetCounter));
        let attempts = 0;
        while (
          planetCounter[type] >= maxCount &&
          maxCount > 0 &&
          attempts < 10
        ) {
          findType = Math.floor(Math.random() * 4);
          type =
            findType === 0
              ? "P1"
              : findType === 1
                ? "P2"
                : findType === 2
                  ? "P3"
                  : "P4";
          attempts++;
        }
        planetCounter[type]++;
        stars.push({
          type: type,
          x: x,
          y: y,
          rot: Math.random() * 360,
        });
        console.log("planet : " + type);
      }
      // the first, fouth, and seventh stars are large stars
      else if (
        i === numberOfPlanets ||
        i === numberOfPlanets + 3 ||
        i === numberOfPlanets + 6
      ) {
        let type = Math.floor(Math.random() * 4);
        console.log("big star : " + type);
        stars.push({
          type:
            type === 0
              ? "BS1"
              : type === 1
                ? "BS2"
                : type === 2
                  ? "BS3"
                  : "BS4",
          x: x,
          y: y,
          rot: Math.random() * 360,
        });
      } else {
        let type = Math.floor(Math.random() * 3);
        console.log("small star : " + type);

        stars.push({
          type: type === 0 ? "S1" : type === 1 ? "S2" : "S3",
          x: x,
          y: y,
          rot: Math.random() * 360,
        });
      }
      console.log("planetcount : " + JSON.stringify(planetCounter));
    }
  }
  // animate the last child
  // show svg animation for 1 second, hide the animation, scale the star in bezier curve to right size
  return (
    <div
      className={`relative flex place-items-center `}
      style={{ width: width, height: height }}
    >
      <div className="absolute">
        <Sky accent1={theme.colors["accent-1"]} />
      </div>
      <div
        className="absolute"
        style={{ top: `${moonPosY}px`, left: `${moonPosX}px` }}
      >
        <Moon
          accent1={theme.colors["accent-1"]}
          accent2={theme.colors["accent-2"]}
        />
      </div>
      {stars.map((star, index) => {
        let lastChild = index + 1 === stars.length;
        return (
          <div
            key={index}
            className={`absolute ${lastChild ? "new-star" : ""}`}
            style={{ top: `${star.y}px`, left: `${star.x}px` }}
          >
            {star.type === "S1" ? (
              <Star1 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "S2" ? (
              <Star2 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "S3" ? (
              <Star3 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "BS1" ? (
              <BigStar1 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "BS2" ? (
              <BigStar2 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "BS3" ? (
              <BigStar3 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "BS4" ? (
              <BigStar4 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "P1" ? (
              <Planet1 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "P2" ? (
              <Planet2 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "P3" ? (
              <Planet3 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : star.type === "P4" ? (
              <Planet4 rot={star.rot} accent2={theme.colors["accent-2"]} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
