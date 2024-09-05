import { ImageResponse } from "next/og";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "../../supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { parseHSBToRGB } from "src/utils/parseHSB";
import { cookies } from "next/headers";

// Route segment config
export const revalidate = 0;
export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function Icon() {
  let cookieStore = cookies();
  let identity = cookieStore.get("identity");
  let rootEntity: string | null = null;
  if (identity) {
    let res = await supabase
      .from("identities")
      .select(
        `*,
        permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
      permission_token_on_homepage(
        *, permission_tokens(*, permission_token_rights(*))
      )
      `,
      )
      .eq("id", identity?.value)
      .single();
    rootEntity = res.data?.permission_tokens?.root_entity || null;
  }
  let outlineColor, fillColor;
  if (rootEntity) {
    let { data } = await supabase.rpc("get_facts", {
      root: rootEntity,
    });
    let initialFacts =
      (data as unknown as Fact<keyof typeof Attributes>[]) || [];
    let themePageBG = initialFacts.find(
      (f) => f.attribute === "theme/card-background",
    ) as Fact<"theme/card-background"> | undefined;

    let themePrimary = initialFacts.find(
      (f) => f.attribute === "theme/primary",
    ) as Fact<"theme/primary"> | undefined;

    outlineColor = parseHSBToRGB(`hsba(${themePageBG?.data.value})`);

    fillColor = parseHSBToRGB(`hsba(${themePrimary?.data.value})`);
  }

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div style={{ display: "flex" }}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* outline */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.09628 21.8809C2.1044 23.5376 1.19806 25.3395 0.412496 27.2953C-0.200813 28.8223 0.539843 30.5573 2.06678 31.1706C3.59372 31.7839 5.32873 31.0433 5.94204 29.5163C6.09732 29.1297 6.24696 28.7489 6.39151 28.3811L6.39286 28.3777C6.94334 26.9769 7.41811 25.7783 7.99246 24.6987C8.63933 24.6636 9.37895 24.6582 10.2129 24.6535L10.3177 24.653C11.8387 24.6446 13.6711 24.6345 15.2513 24.3147C16.8324 23.9947 18.789 23.2382 19.654 21.2118C19.8881 20.6633 20.1256 19.8536 19.9176 19.0311C19.98 19.0311 20.044 19.031 20.1096 19.031C20.1447 19.031 20.1805 19.0311 20.2169 19.0311C21.0513 19.0316 22.2255 19.0324 23.2752 18.7469C24.5 18.4137 25.7878 17.6248 26.3528 15.9629C26.557 15.3624 26.5948 14.7318 26.4186 14.1358C26.4726 14.1262 26.528 14.1165 26.5848 14.1065C26.6121 14.1018 26.6398 14.0969 26.6679 14.092C27.3851 13.9667 28.3451 13.7989 29.1653 13.4921C29.963 13.1936 31.274 12.5268 31.6667 10.9987C31.8906 10.1277 31.8672 9.20568 31.3642 8.37294C31.1551 8.02669 30.889 7.75407 30.653 7.55302C30.8728 7.27791 31.1524 6.89517 31.345 6.47292C31.6791 5.74032 31.8513 4.66394 31.1679 3.61078C30.3923 2.4155 29.0623 2.2067 28.4044 2.1526C27.7203 2.09635 26.9849 2.15644 26.4564 2.2042C26.3846 2.02839 26.2858 1.84351 26.1492 1.66106C25.4155 0.681263 24.2775 0.598914 23.6369 0.61614C22.3428 0.650943 21.3306 1.22518 20.5989 1.82076C20.2149 2.13334 19.8688 2.48545 19.5698 2.81786C18.977 2.20421 18.1625 1.90193 17.3552 1.77751C15.7877 1.53594 14.5082 2.58853 13.6056 3.74374C12.4805 5.18375 11.7295 6.8566 10.7361 8.38059C10.3814 8.14984 9.83685 7.89945 9.16529 7.93065C8.05881 7.98204 7.26987 8.73225 6.79424 9.24551C5.96656 10.1387 5.46273 11.5208 5.10424 12.7289C4.71615 14.0368 4.38077 15.5845 4.06569 17.1171C3.87054 18.0664 3.82742 18.5183 4.01638 20.2489C3.43705 21.1826 3.54993 21.0505 3.09628 21.8809Z"
            fill={outlineColor ? outlineColor : "#FFFFFF"}
          />

          {/* fill */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.86889 10.2435C10.1927 10.528 10.5723 10.8615 11.3911 10.5766C11.9265 10.3903 12.6184 9.17682 13.3904 7.82283C14.5188 5.84367 15.8184 3.56431 17.0505 3.7542C18.5368 3.98325 18.4453 4.80602 18.3749 5.43886C18.3255 5.88274 18.2866 6.23317 18.8098 6.21972C19.3427 6.20601 19.8613 5.57971 20.4632 4.8529C21.2945 3.84896 22.2847 2.65325 23.6906 2.61544C24.6819 2.58879 24.6663 3.01595 24.6504 3.44913C24.6403 3.72602 24.63 4.00537 24.8826 4.17024C25.1314 4.33266 25.7571 4.2759 26.4763 4.21065C27.6294 4.10605 29.023 3.97963 29.4902 4.6995C29.9008 5.33235 29.3776 5.96135 28.8762 6.56423C28.4514 7.07488 28.0422 7.56679 28.2293 8.02646C28.3819 8.40149 28.6952 8.61278 29.0024 8.81991C29.5047 9.15866 29.9905 9.48627 29.7297 10.5009C29.4539 11.5737 27.7949 11.8642 26.2398 12.1366C24.937 12.3647 23.7072 12.5801 23.4247 13.2319C23.2475 13.6407 23.5414 13.8311 23.8707 14.0444C24.2642 14.2992 24.7082 14.5869 24.4592 15.3191C23.8772 17.031 21.9336 17.031 20.1095 17.0311C18.5438 17.0311 17.0661 17.0311 16.6131 18.1137C16.3515 18.7387 16.7474 18.849 17.1818 18.9701C17.7135 19.1183 18.3029 19.2826 17.8145 20.4267C16.8799 22.6161 13.3934 22.6357 10.2017 22.6536C9.03136 22.6602 7.90071 22.6665 6.95003 22.7795C6.84152 22.7924 6.74527 22.8547 6.6884 22.948C5.81361 24.3834 5.19318 25.9622 4.53139 27.6462C4.38601 28.0162 4.23862 28.3912 4.08611 28.7709C3.88449 29.2729 3.31413 29.5163 2.81217 29.3147C2.31021 29.1131 2.06673 28.5427 2.26834 28.0408C3.01927 26.1712 3.88558 24.452 4.83285 22.8739C6.37878 20.027 9.42621 16.5342 12.6488 13.9103C15.5162 11.523 18.2544 9.73614 21.4413 8.38026C21.8402 8.21054 21.7218 7.74402 21.3053 7.86437C18.4789 8.68119 15.9802 10.3013 13.3904 11.9341C10.5735 13.71 8.21288 16.1115 6.76027 17.8575C6.50414 18.1653 5.94404 17.9122 6.02468 17.5199C6.65556 14.4512 7.30668 11.6349 8.26116 10.605C9.16734 9.62708 9.47742 9.8995 9.86889 10.2435Z"
            fill={fillColor ? fillColor : "#272727"}
          />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported icons size metadata
      // config to also set the ImageResponse's width and height.
      ...size,
      headers: {
        "Cache-Control": "no-cache",
      },
    },
  );
}
