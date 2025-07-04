export const Sky = (props: { accent1: string }) => {
  return (
    <svg
      width="320"
      height="256"
      viewBox="0 0 320 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M305.9 29.3077C292.678 6.40711 198.036 -12.4992 134.412 12.0204C70.8324 36.5232 0 4.06591 0 69.2595C0 113.399 18.9911 116.101 18.9911 154.467C18.9911 181.683 3.71417 180.358 15.116 213.54C22.2418 234.278 43.3688 235.473 76.2473 238.211C108.136 240.866 147.499 250.212 189.533 254.597C249.28 260.831 301.715 253.26 314.778 223.928C327.796 194.696 302.571 177.048 300.923 146.748C298.613 104.25 326.317 64.6716 305.9 29.3077Z"
        fill={props.accent1}
      />
    </svg>
  );
};
export const Moon = (props: { accent1: string; accent2: string }) => {
  return (
    <svg
      width="83"
      height="82"
      viewBox="0 0 83 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M39.5764 0.35902C46.6289 0.201893 52.0566 1.26601 57.0905 3.60507C62.4228 6.08279 67.2346 9.95994 73.0133 15.1247L73.5977 15.6692C79.549 21.43 82.4432 31.2377 82.4651 41.1212C82.4869 51.0252 79.629 61.3482 73.6799 68.2397L73.0954 68.8969C59.0019 84.1756 29.1899 87.7812 11.2656 68.6364L10.4206 67.7093C1.84925 57.9995 -0.190166 46.9334 0.811564 37.3001C1.80872 27.7133 5.82335 19.458 9.50525 15.2303L11.167 13.369C14.9913 9.19437 18.497 6.18623 22.4026 4.12378C26.8824 1.75836 31.7942 0.6872 38.1447 0.408309L39.5764 0.35902Z"
        fill={props.accent2}
      />
      <path
        opacity="0.1"
        d="M28.1365 2.34505C40.1347 -0.615521 51.8649 1.17601 61.615 7.50228C69.2917 12.4832 74.3026 18.758 77.3914 25.1644C75.1858 23.4319 72.3584 22.1715 69.324 21.6605C63.9703 20.7593 57.8224 22.1514 52.9578 27.4622C48.085 32.7825 46.8443 40.0262 48.0994 46.4027C49.3485 52.748 53.1322 58.5127 58.6463 60.7074L59.45 60.9857C63.5073 62.2161 68.1721 60.8936 71.8006 58.9544C73.7659 57.904 75.5179 56.6276 76.8201 55.349C77.4712 54.7095 78.0284 54.0482 78.4441 53.3978C78.8514 52.7605 79.1711 52.058 79.2459 51.3431L78.0496 51.221L76.8533 51.0951C76.832 51.2952 76.7198 51.6339 76.4187 52.1048C76.1254 52.5637 75.6956 53.084 75.1365 53.6331C74.0176 54.7319 72.4568 55.8777 70.6668 56.8343C67.2525 58.659 63.3135 59.6393 60.157 58.6898L59.5359 58.473C55.01 56.6719 51.607 51.7607 50.4607 45.9388C49.3207 40.1475 50.4766 33.7305 54.7303 29.0863C58.9921 24.4332 64.2951 23.2519 68.9256 24.0316C73.335 24.7741 77.0047 27.264 78.6209 30.1117L78.9168 30.6859L79.0428 30.8958C79.2299 31.1493 79.5058 31.3138 79.8055 31.3656C82.0719 38.8672 82.0034 46.0322 80.8074 50.9652C76.1672 70.1046 79.3843 70.5478 66.1599 75.2747C50.2096 80.9761 27.7949 71.9599 17.0838 48.7523C15.5801 45.4942 14.4203 41.9428 13.6492 38.2992C13.7259 38.2869 13.8033 38.2749 13.8807 38.2611C17.5728 37.5986 21.9293 35.064 25.7879 29.3919C27.7298 26.5372 28.6137 24.0225 28.7215 21.8206C28.8299 19.5995 28.142 17.7929 27.118 16.3919C26.1069 15.0089 24.7836 14.0393 23.614 13.4105C22.6217 12.877 21.6334 12.533 20.9373 12.429L20.659 12.3978L20.4148 12.4085C19.8619 12.4894 19.4245 12.951 19.3914 13.5306C19.3584 14.1106 19.7413 14.6183 20.282 14.7611L20.5213 14.7992L20.7732 14.8421C21.1207 14.9246 21.7387 15.1307 22.4754 15.5267C23.422 16.0357 24.4329 16.7915 25.1775 17.8099C25.9087 18.8101 26.4009 20.0817 26.3221 21.7015C26.2419 23.3414 25.572 25.4363 23.8006 28.0404C20.2316 33.2866 16.3919 35.3689 13.4539 35.8958C13.3709 35.9107 13.2884 35.9234 13.2068 35.9359C10.7901 21.18 14.7982 5.63641 28.1365 2.34505ZM47.7752 45.9163C47.5521 45.4045 46.9933 45.1022 46.4256 45.222C45.8574 45.3422 45.4686 45.8455 45.4724 46.4046L45.4978 46.6468L45.7469 47.9095C45.994 49.2056 46.2674 50.5994 46.8289 52.0872C47.5966 54.1213 48.8924 56.342 51.3543 59.0814L52.1892 59.9681C54.124 61.923 55.9406 63.0784 57.5926 63.7454C59.4833 64.5087 61.0853 64.6018 62.2615 64.6019C64.5106 64.6018 67.5663 63.8655 70.3943 62.3275C70.9771 62.0103 71.1917 61.2815 70.8748 60.6986C70.5577 60.1156 69.8289 59.9 69.2459 60.2171C66.7295 61.5856 64.0653 62.1985 62.2615 62.1986C61.2438 62.1985 59.9849 62.1177 58.492 61.515C57.182 60.986 55.6336 60.0304 53.8982 58.2767L53.1424 57.474C50.841 54.9132 49.7214 52.9444 49.0779 51.2396C48.7469 50.3624 48.5358 49.5557 48.3611 48.7357L47.8504 46.1488L47.7752 45.9163ZM26.742 45.4154C25.7675 45.353 24.8931 45.6722 24.2 46.2298C22.9388 47.2449 22.3127 48.9892 22.3875 50.7376L22.4099 51.0872C22.4738 51.7478 23.0628 52.2322 23.7234 52.1683C24.3837 52.1042 24.8672 51.5161 24.8035 50.8558L24.784 50.3939C24.7973 49.3426 25.21 48.5037 25.7058 48.1038C25.9688 47.8923 26.2599 47.7938 26.5877 47.8148C26.9287 47.8366 27.4172 47.9953 28.0291 48.4974C28.538 48.9152 29.0288 49.7168 29.3445 50.7249C29.6567 51.722 29.7403 52.7445 29.6053 53.4896C29.4651 54.2618 29.1878 54.3867 29.0574 54.4124C28.8029 54.4618 28.1332 54.3905 26.909 53.5218L26.3474 53.096L26.1453 52.9642C25.648 52.7092 25.0231 52.8305 24.6599 53.2835C24.2968 53.7369 24.3149 54.3733 24.6726 54.8031L24.8455 54.974L25.4773 55.4505C26.9346 56.4928 28.3003 57.012 29.5223 56.7718C31.0785 56.4657 31.7556 55.1077 31.9715 53.9173C32.1921 52.6992 32.0357 51.2749 31.6385 50.0062C31.2445 48.7481 30.5572 47.4636 29.5555 46.641C28.6568 45.9033 27.7033 45.4771 26.742 45.4154ZM78.1756 50.0247C77.5155 49.9557 76.9224 50.435 76.8533 51.0951L79.2459 51.3431C79.3143 50.6838 78.8348 50.0943 78.1756 50.0247Z"
        fill={props.accent1}
      />
    </svg>
  );
};
export const Star1 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot})`}
      width="6"
      height="6"
      viewBox="0 0 6 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.68149 1.57369C5.33053 0.649526 3.90347 0.193405 3.27179 0.158325C1.35339 0.158325 0.800329 2.08777 0.613166 3.12887C0.426003 4.16996 1.8791 6.01566 3.79819 5.42227C6.40585 4.61597 6.03244 2.49785 5.68149 1.57369Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const Star2 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot})`}
      width="7"
      height="7"
      viewBox="0 0 7 7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.7682 1.6562C5.017 0.533994 3.99698 0.0397203 2.73375 0.182269C0.847773 0.39509 -0.411791 3.19403 0.349589 4.64724C1.80237 7.42009 4.33914 6.37922 5.26252 5.48533C5.99905 4.77233 6.51939 2.7784 5.7682 1.6562Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const Star3 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot})`}
      width="6"
      height="6"
      viewBox="0 0 6 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.73874 4.44866C6.89559 2.0937 3.96079 -0.183514 2.0317 0.201018C0.286382 0.548919 -0.323154 3.30424 0.38105 4.44866C0.920336 5.32506 2.5819 6.80361 4.73874 4.44866Z"
        fill={props.accent2}
      />
    </svg>
  );
};

export const BigStar1 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot})`}
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.18339 0.17502C5.92979 -0.02444 7.86206 0.827139 9.00904 2.15363C9.64639 2.89113 10.1058 3.84734 10.1098 4.94434C10.1138 6.05426 9.65117 7.14941 8.73678 8.14814C7.0297 10.012 5.27176 10.5873 3.67407 10.1948C2.38946 9.87894 1.46885 8.99484 0.94438 8.26785L0.742529 7.96742C0.353112 7.33452 0.194728 6.56903 0.169834 5.84563C0.144578 5.10878 0.255784 4.3253 0.493735 3.58771C0.951982 2.16788 2.00641 0.593706 3.83602 0.229003L4.18339 0.17502ZM4.30544 2.58785C3.69911 2.70906 3.11016 3.30117 2.77982 4.32471C2.62373 4.80836 2.55555 5.31536 2.57093 5.76348C2.58683 6.22562 2.68953 6.54122 2.79155 6.70702L3.04973 7.06143C3.35162 7.41412 3.77617 7.74563 4.24911 7.8618C4.75195 7.98501 5.66005 7.94781 6.96236 6.52629C7.55227 5.8822 7.70762 5.34706 7.7064 4.95373C7.70491 4.54752 7.53661 4.12466 7.19003 3.72385C6.53786 2.96993 5.47705 2.53267 4.64577 2.55029L4.30544 2.58785Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const BigStar2 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot})`}
      width="11"
      height="10"
      viewBox="0 0 11 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.05309 0.0099759C5.86902 -0.031498 6.65477 0.109017 7.37907 0.460621C8.20233 0.860394 8.87568 1.49888 9.41401 2.3031C10.0989 3.32642 10.1367 4.6053 9.95854 5.61722C9.80311 6.49934 9.44049 7.42853 8.89765 8.08637L8.6559 8.34925C7.93894 9.04331 6.64341 9.77661 5.18922 9.81619C4.43638 9.83661 3.63368 9.66857 2.87497 9.20594C2.21309 8.80225 1.63539 8.20422 1.15924 7.40806L0.962081 7.05599C0.261886 5.71957 0.56029 4.02739 1.1874 2.77722C1.82314 1.51043 3.03223 0.22672 4.70337 0.0381412L5.05309 0.0099759ZM4.97329 2.4275C4.42083 2.48984 3.77361 2.9825 3.33501 3.85689C2.88837 4.74784 2.89331 5.56398 3.09091 5.94112L3.35378 6.38237C3.61843 6.77017 3.88594 7.00815 4.12598 7.15457C4.44368 7.34829 4.77859 7.42203 5.1235 7.41275C5.86558 7.39255 6.61282 6.98418 6.98476 6.62413L7.14201 6.42227C7.31053 6.16263 7.49898 5.73306 7.59266 5.20178C7.71681 4.49718 7.61725 3.93832 7.41663 3.6386C7.06941 3.12018 6.69916 2.80504 6.32757 2.62465C6.05153 2.4907 5.73535 2.41104 5.36291 2.40637L4.97329 2.4275Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const BigStar3 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.88239 8.34326C7.54585 8.34352 8.08356 8.88188 8.08356 9.54541V11.0894C8.08295 11.7524 7.54548 12.2912 6.88239 12.2915C6.21907 12.2915 5.68085 11.7525 5.68024 11.0894V9.54541C5.68024 8.88172 6.21869 8.34326 6.88239 8.34326ZM3.51227 4.95557C4.17594 4.95557 4.71438 5.49308 4.71442 6.15674C4.71442 6.82043 4.17596 7.35889 3.51227 7.35889H1.96832C1.30515 7.35828 0.766174 6.82005 0.766174 6.15674C0.766209 5.49345 1.30517 4.95618 1.96832 4.95557H3.51227ZM11.6177 4.95557C12.2812 4.9558 12.8189 5.49322 12.8189 6.15674C12.8189 6.82029 12.2812 7.35866 11.6177 7.35889H10.0728C9.40969 7.35822 8.87164 6.82002 8.87164 6.15674C8.87168 5.49349 9.40971 4.95623 10.0728 4.95557H11.6177ZM6.88239 0.0229492C7.54585 0.0232118 8.08356 0.561569 8.08356 1.2251V2.76904C8.08295 3.43205 7.54548 3.97093 6.88239 3.97119C6.21907 3.97119 5.68085 3.43222 5.68024 2.76904V1.2251C5.68024 0.561407 6.21869 0.0229492 6.88239 0.0229492Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const BigStar4 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      width="18"
      height="23"
      viewBox="0 0 18 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.12329 13.8867C9.78665 13.8871 10.3245 14.4254 10.3245 15.0889C10.3245 15.112 10.3236 15.1416 10.3157 15.5625C10.312 15.7585 10.315 16.0321 10.3176 16.3398L10.3157 17.2197C10.3077 17.5155 10.2887 17.7385 10.2708 17.9072C10.2634 17.9768 10.2525 18.0686 10.2493 18.0977L10.2454 18.1309C10.2421 18.2438 10.2249 18.6711 10.2288 19.2803L10.261 19.9941L10.3528 20.6416L10.3743 20.8857C10.3661 21.4439 9.96733 21.9389 9.39771 22.0479C8.82707 22.1565 8.27216 21.8424 8.05981 21.3252L7.99146 21.0928L7.91919 20.6562C7.87844 20.3639 7.85142 20.067 7.83716 19.7617L7.82544 19.2949C7.82122 18.6353 7.84114 18.1622 7.84399 18.0625L7.8606 17.832C7.86871 17.7588 7.87321 17.7285 7.8811 17.6543C7.89384 17.5344 7.90839 17.3748 7.91431 17.1543V16.3604C7.91179 16.0706 7.90787 15.7535 7.91235 15.5156C7.91642 15.2998 7.91818 15.1895 7.91919 15.1328L7.92114 15.0889C7.92114 14.4252 8.4596 13.8867 9.12329 13.8867ZM14.5813 10.3135H15.5149L16.4895 10.3457L16.7307 10.3809C17.2725 10.5161 17.663 11.0171 17.6389 11.5967C17.6144 12.1772 17.1824 12.6449 16.6301 12.7334L16.3879 12.7471L15.468 12.7168H14.6165C14.4599 12.7191 14.2326 12.7154 14.05 12.7139C13.9548 12.713 13.8685 12.7119 13.7971 12.7119C13.7616 12.7119 13.7309 12.7135 13.7083 12.7139H13.6799C13.3598 12.7313 12.8208 12.749 12.5549 12.749C11.8918 12.7488 11.3543 12.211 11.3538 11.5479C11.3538 10.8843 11.8914 10.3459 12.5549 10.3457C12.7647 10.3457 13.2568 10.3293 13.5481 10.3135L14.0715 10.3105C14.2726 10.3123 14.4608 10.3153 14.5813 10.3135ZM3.00903 9.94238L3.47583 9.96387C3.62499 9.9749 3.76617 9.98932 3.89087 10.001C4.15841 10.026 4.36909 10.0439 4.56763 10.0439C4.80786 10.044 5.04276 10.0693 5.20142 10.0859L5.59497 10.1162L5.83716 10.1396C6.38497 10.2515 6.79712 10.7375 6.79712 11.3184C6.79668 11.8987 6.38457 12.3822 5.83716 12.4941L5.59497 12.5195L4.94946 12.4775C4.76558 12.4583 4.6598 12.4474 4.56763 12.4473C4.24055 12.4473 3.92203 12.4165 3.66626 12.3926L2.98267 12.3457L1.90845 12.3438L1.66626 12.3203C1.11838 12.2085 0.706299 11.7225 0.706299 11.1416C0.706664 10.4782 1.24498 9.94043 1.90845 9.94043L3.00903 9.94238ZM9.12817 0.804688C9.79174 0.804828 10.3284 1.34227 10.3284 2.00586C10.3284 3.13742 10.3508 3.5476 10.3293 4.34766L10.2493 6.27051L10.2366 6.96582L10.2395 7.33691L10.2649 7.66211L10.2678 7.90723C10.2229 8.46391 9.79289 8.93107 9.21704 9.00195C8.64036 9.07235 8.10825 8.72184 7.93091 8.19141L7.87817 7.9541L7.83618 7.42188L7.83228 6.93066L7.8479 6.17969L7.92603 4.28223C7.94655 3.51747 7.92505 3.23863 7.92505 2.00488C7.92533 1.34143 8.46466 0.804688 9.12817 0.804688Z"
        fill={props.accent2}
      />
    </svg>
  );
};

export const Planet1 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot / 10})`}
      width="48"
      height="28"
      viewBox="0 0 48 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M35.7149 22.9566C35.4321 23.4097 35.1145 23.8472 34.7559 24.2593C33.313 25.9171 31.2794 27.1312 28.5557 27.5836C23.3836 28.4419 18.8681 27.4293 15.6885 24.7203C15.2765 24.3692 14.8923 23.9898 14.5323 23.5884C17.7734 23.8917 21.275 24.0227 24.7198 23.939L26.9327 23.856C30.0229 23.7054 33.0085 23.3984 35.7149 22.9566ZM40.5147 10.3043C41.2764 10.3268 42.7419 10.5869 44.0518 11.0884C44.7111 11.341 45.4067 11.6832 45.9698 12.1402C46.5274 12.593 47.0852 13.2691 47.1641 14.189L47.1729 14.4703C47.1543 15.849 46.1154 16.8774 45.0147 17.5826C43.7768 18.3754 42.0445 19.042 40.0303 19.5894C35.9786 20.6902 30.4711 21.3935 24.6612 21.5347C18.8459 21.676 12.9061 21.2111 8.46391 20.3052C6.25643 19.855 4.33756 19.2804 2.97953 18.5728C2.3046 18.2211 1.68468 17.7942 1.24906 17.2632C0.848391 16.7747 0.579596 16.1584 0.624064 15.4625L0.661173 15.1588C0.969907 13.5545 1.98424 12.5557 3.15824 11.8912C4.27433 11.2598 5.66027 10.86 6.87407 10.4918L7.11235 10.4459C7.66899 10.3939 8.2054 10.7397 8.37407 11.2955C8.56608 11.9303 8.20606 12.6009 7.57133 12.7935L6.62797 13.0826C5.72954 13.3627 4.96381 13.6295 4.34086 13.982C3.57276 14.4168 3.16032 14.9026 3.0225 15.6021L3.10649 15.7398C3.25213 15.9172 3.55576 16.1621 4.09086 16.441C5.15459 16.9952 6.8169 17.5159 8.94438 17.9498C13.1736 18.8122 18.9281 19.2712 24.6036 19.1334C30.2847 18.9953 35.5869 18.3066 39.3985 17.2711C41.3144 16.7505 42.777 16.1609 43.7169 15.5591C44.468 15.078 44.6897 14.7256 44.7491 14.5328L44.7686 14.3931C44.7669 14.3761 44.7443 14.2412 44.4551 14.0064C44.1664 13.7721 43.7305 13.5396 43.1924 13.3336C42.1069 12.9179 40.9082 12.7194 40.4444 12.7056C39.7818 12.6856 39.2585 12.1329 39.2774 11.4703C39.2969 10.8073 39.8519 10.2855 40.5147 10.3043ZM16.5332 2.04449C19.6052 0.285132 23.4595 0.187911 27.0264 0.973203L27.879 1.19098C32.0211 2.40274 34.3957 5.40698 36.2481 8.53473C36.8433 9.54001 37.3 11.1 37.5264 12.8228C37.6256 13.5776 37.6814 14.386 37.6836 15.2213C34.6828 15.9293 30.8213 16.4471 26.6045 16.6539L24.545 16.7291C19.7894 16.8446 15.0092 16.5245 11.21 15.9136C11.0725 14.8359 11.0228 13.702 11.0743 12.5181C11.3034 7.2564 13.3834 3.84956 16.5332 2.04449Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const Planet2 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot / 10})`}
      width="28"
      height="29"
      viewBox="0 0 28 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.6808 0.715415C19.1015 0.852801 23.2478 2.42518 25.0902 6.14664L25.5056 7.04089C26.483 9.28306 27.4611 12.5717 27.2754 15.967C27.058 19.9338 25.2377 24.0196 20.1636 26.6252C15.0011 29.2756 9.61917 27.8708 5.84159 24.886C2.11649 21.9423 -0.351293 17.2083 0.6451 12.843L1.00655 11.4089C1.9115 8.16176 3.24497 5.60629 5.16797 3.79952C7.39395 1.70871 10.2738 0.748828 13.7936 0.708374L14.6808 0.715415ZM13.2538 3.1259C12.6132 3.15466 12.0094 3.21936 11.4418 3.32071C11.9139 3.96261 12.3798 4.55729 12.8195 5.12095C13.4376 5.91327 14.0359 6.69023 14.4578 7.40938C14.8706 8.11307 15.2381 8.96244 15.1338 9.87855C15.0209 10.8659 14.4066 11.6141 13.5659 12.1881C11.984 13.2678 10.349 13.5198 9.27306 13.7161C8.68726 13.823 8.36173 13.8982 8.15349 13.9954C8.02792 14.0541 8.05335 14.0659 8.05491 14.0681C7.88948 14.67 7.51647 15.1738 7.14658 15.5633C6.76555 15.9643 6.30709 16.3261 5.85568 16.6359C5.03056 17.2019 4.12178 17.661 3.46867 17.9456C4.2048 19.7957 5.54517 21.5894 7.332 23.0013C9.10462 24.4018 11.2235 25.3462 13.458 25.5667C13.4875 25.3245 13.5894 25.088 13.7678 24.8954C14.2647 24.3597 14.4866 24.0174 14.5822 23.8298C14.4386 23.7437 14.2122 23.6379 13.8311 23.4613C13.3912 23.2574 12.778 22.9677 12.2492 22.5224C11.7196 22.0763 11.3198 21.5372 11.0968 20.9029C10.8746 20.2702 10.8527 19.6133 10.9677 18.9713C11.19 17.7305 11.9377 16.4455 12.9181 15.1666L13.0965 14.9554C14.0228 13.9658 15.3625 14.0039 16.244 14.1315C16.7565 14.2058 17.2699 14.3338 17.7062 14.446C18.1707 14.5655 18.527 14.662 18.8305 14.7159L19.0206 14.7253C19.2225 14.7106 19.4777 14.6169 19.9242 14.3991C20.4194 14.1575 21.2793 13.6809 22.2925 13.6809C23.2102 13.6809 24.0869 13.8888 24.8719 14.392C24.7469 11.9934 24.0385 9.69788 23.3088 8.01963L22.9356 7.21223C21.5819 4.47881 18.2062 3.06161 13.8194 3.11182L13.2538 3.1259ZM22.2925 16.0843C21.9532 16.0843 21.646 16.235 20.9781 16.5608C20.4814 16.803 19.7259 17.1688 18.8117 17.1264L18.4103 17.0818C17.9916 17.0074 17.5154 16.8792 17.1077 16.7744C16.6723 16.6624 16.2722 16.5653 15.9013 16.5115C15.2824 16.4218 15.0185 16.4913 14.9014 16.5631L14.824 16.6288C13.9125 17.8178 13.453 18.7292 13.3336 19.3937C13.2781 19.7036 13.3031 19.9308 13.3641 20.1049C13.4245 20.277 13.5469 20.4729 13.7983 20.6847C14.0509 20.8973 14.3878 21.0676 14.8427 21.2785C15.2152 21.4511 15.8263 21.7145 16.2651 22.0859C16.5115 22.2945 16.7708 22.5869 16.9223 22.9895C17.078 23.4044 17.0823 23.8353 16.9833 24.2452C16.8899 24.6313 16.6977 25.0181 16.4341 25.4117C17.3124 25.2312 18.1956 24.9334 19.0652 24.487C22.4563 22.7457 24.0329 20.2986 24.6137 17.7273L24.4307 17.3682C24.1693 16.9188 23.8975 16.6329 23.635 16.4505C23.2955 16.215 22.8739 16.0843 22.2925 16.0843ZM9.01957 4.06475C8.19084 4.44688 7.46053 4.94261 6.81329 5.55047C5.3155 6.95772 4.15726 9.06578 3.32549 12.0473L2.98751 13.3781C2.82667 14.0829 2.79488 14.8234 2.8725 15.5773C3.36523 15.3418 3.96051 15.0205 4.4967 14.6526C4.86428 14.4004 5.1758 14.1473 5.40268 13.9085C5.63925 13.6595 5.71801 13.4962 5.73597 13.4321C5.96439 12.6023 6.52414 12.1045 7.13954 11.8173C7.67855 11.5659 8.32141 11.4497 8.84119 11.3549C9.97703 11.1476 11.1097 10.9528 12.2093 10.2024C12.7052 9.86392 12.738 9.66209 12.7444 9.60628C12.7587 9.48057 12.7208 9.19469 12.3853 8.62284C12.0589 8.06675 11.5649 7.42234 10.9231 6.59963C10.4544 5.99886 9.92216 5.3223 9.37633 4.57172L9.01957 4.06475Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const Planet3 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${props.rot / 10})`}
      width="27"
      height="26"
      viewBox="0 0 27 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.6444 0.493736C14.9562 0.244501 17.5383 0.478005 19.876 1.59453C22.5909 2.89169 24.8685 5.33153 25.9879 9.29543C27.0784 13.1574 26.867 16.7067 25.4035 19.5007C23.9273 22.3178 21.255 24.2143 17.7612 24.8756C14.4573 25.5006 10.7569 25.508 7.64503 24.1785C4.4518 22.814 1.99829 20.0871 1.24674 15.5693C0.520711 11.202 1.31706 7.71836 3.30752 5.1692C5.28209 2.64151 8.29648 1.2031 11.6727 0.627522L12.6444 0.493736ZM18.8409 3.76327C16.9976 2.88267 14.884 2.66929 12.912 2.88076L12.0764 2.99811C9.27275 3.47611 6.98987 4.58504 5.48097 6.30989C6.28967 6.43473 7.1758 6.49894 7.98537 6.52348C8.60471 6.54223 9.15362 6.53875 9.54621 6.53052C9.74161 6.52642 9.90011 6.52295 10.0062 6.51879C10.0583 6.51674 10.0996 6.51304 10.126 6.51175H10.1612L10.4053 6.52113C10.958 6.60328 11.3946 7.06569 11.4263 7.6454C11.4575 8.22528 11.0729 8.73164 10.532 8.87295L10.2926 8.9105H10.2879C10.2852 8.91098 10.2801 8.91265 10.2762 8.91285C10.2673 8.91317 10.2538 8.91213 10.2386 8.91285C10.2062 8.9144 10.1589 8.91758 10.1001 8.91989C9.98095 8.92457 9.80918 8.92953 9.59785 8.93397C9.1743 8.94286 8.58242 8.94721 7.9126 8.92693C6.79416 8.89302 5.37299 8.78825 4.12667 8.49741C3.99 8.82458 3.86858 9.16805 3.76756 9.53014C4.6411 9.68698 5.54927 9.77566 6.32594 9.81884C6.8578 9.84838 7.31562 9.85649 7.63799 9.85874C7.79852 9.85985 7.926 9.8597 8.01118 9.85874C8.05268 9.85826 8.08432 9.85679 8.10507 9.85639H8.13323L8.37734 9.87517C8.92676 9.97277 9.35149 10.4458 9.36783 11.0253C9.38346 11.6055 8.98466 12.1022 8.44071 12.2293L8.19895 12.2598H8.15201C8.125 12.2604 8.0858 12.2616 8.037 12.2622C7.93828 12.2633 7.79569 12.2634 7.61921 12.2622C7.26586 12.2597 6.76967 12.2497 6.19215 12.2176C5.38557 12.1728 4.39305 12.0809 3.39671 11.9054C3.35019 12.8945 3.41899 13.9818 3.61734 15.175C4.23596 18.8936 6.15951 20.9292 8.58858 21.9675C10.6481 22.8474 13.1489 23.0312 15.6628 22.7538C15.1671 22.7549 14.7044 22.7505 14.2921 22.7327C13.6973 22.707 13.1975 22.6688 12.8463 22.6364C12.6714 22.6203 12.5323 22.605 12.4355 22.5942C12.3878 22.5889 12.3494 22.5856 12.3229 22.5825C12.3098 22.5809 12.2976 22.5787 12.29 22.5778C12.2875 22.5774 12.283 22.5778 12.283 22.5778L12.2783 22.5754L12.0412 22.5214C11.5118 22.3407 11.1643 21.8068 11.2385 21.2305C11.3233 20.5726 11.9255 20.1088 12.5834 20.1931H12.5881C12.5923 20.1936 12.5999 20.1943 12.6092 20.1954C12.6291 20.1979 12.662 20.2026 12.7031 20.2072C12.7856 20.2164 12.9092 20.2278 13.0669 20.2424C13.3856 20.2718 13.8456 20.3078 14.3954 20.3316C15.5019 20.3793 16.95 20.3785 18.3668 20.1931L19.0967 20.0851C20.7135 19.8219 21.7145 19.472 22.2959 19.2026C22.6268 19.0492 22.8222 18.9231 22.9178 18.8529C22.9656 18.8178 22.9889 18.7955 22.993 18.7919C22.993 18.7919 22.9898 18.795 22.9859 18.7989C22.9824 18.8025 22.9774 18.8093 22.9718 18.8153C22.9691 18.8183 22.9656 18.8212 22.9624 18.8247C23.003 18.7793 23.0484 18.7405 23.0939 18.7027C23.155 18.5984 23.2183 18.4933 23.2746 18.3858C23.2757 18.3837 23.2758 18.3809 23.277 18.3788C23.2082 18.4025 23.1394 18.4302 23.0681 18.4539C21.3481 19.0248 18.8751 19.5898 15.8248 19.5899C14.2515 19.5899 12.2927 19.4636 10.7479 19.3411C9.97153 19.2795 9.29082 19.2183 8.80452 19.1721C8.5616 19.149 8.36632 19.1293 8.23181 19.1158C8.165 19.109 8.11245 19.1053 8.0769 19.1017C8.06001 19.0999 8.04625 19.098 8.037 19.097C8.03261 19.0965 8.02781 19.095 8.02527 19.0946H8.02057L7.78351 19.0454C7.25046 18.8766 6.89174 18.3509 6.95263 17.7732C7.01418 17.1965 7.47414 16.7593 8.02996 16.7053H8.2858C8.2942 16.7062 8.30703 16.7083 8.32335 16.71C8.35708 16.7135 8.40862 16.7199 8.47357 16.7264C8.60403 16.7395 8.7948 16.7578 9.03219 16.7804C9.50901 16.8257 10.1769 16.8867 10.9381 16.947C12.4697 17.0685 14.3507 17.1864 15.8248 17.1864C18.5766 17.1863 20.7924 16.6762 22.3099 16.1725C23.068 15.9208 23.6513 15.6699 24.0374 15.4871C24.0885 15.463 24.134 15.4358 24.1783 15.4144C24.3856 13.8131 24.2484 11.9751 23.676 9.94793C22.7358 6.6192 20.9041 4.74905 18.8409 3.76327ZM21.066 12.8185C21.5963 12.6434 22.1945 12.8601 22.4836 13.363C22.8135 13.9386 22.6153 14.6734 22.04 15.0036C22.04 15.0036 21.1823 15.4554 19.9534 15.7758C18.8016 16.076 17.1746 16.3459 15.0596 16.3415L14.1231 16.3227C12.7504 16.2693 11.0327 16.1455 9.66826 16.0364C8.98388 15.9816 8.38358 15.9286 7.95485 15.8908C7.74069 15.872 7.56856 15.857 7.45022 15.8462C7.39139 15.8409 7.34521 15.8374 7.31408 15.8345C7.29901 15.8331 7.2869 15.8305 7.27888 15.8298H7.26479L7.02773 15.7829C6.49248 15.6206 6.12633 15.0986 6.18042 14.5201C6.24277 13.8599 6.82974 13.3741 7.49012 13.4357H7.49247C7.49247 13.4357 7.49648 13.4378 7.49951 13.4381C7.50709 13.4388 7.51968 13.4391 7.53472 13.4404C7.56488 13.4432 7.61048 13.4469 7.6685 13.4522C7.78473 13.4628 7.95467 13.4781 8.16609 13.4968C8.58971 13.5341 9.18233 13.5859 9.85838 13.6399C11.2163 13.7485 12.8953 13.8679 14.217 13.9193L15.0643 13.938C16.9706 13.9421 18.3912 13.6985 19.3455 13.4498C19.891 13.3076 20.2872 13.1633 20.5355 13.0602C20.6596 13.0087 20.7471 12.9658 20.7984 12.9405L20.8453 12.9194L21.066 12.8185ZM20.8477 12.917L20.8453 12.9194V12.917H20.8477L20.85 12.9147H20.8524L20.8477 12.917ZM16.8176 3.84542C17.456 3.6653 18.1204 4.03797 18.301 4.6763C18.4807 5.31419 18.1101 5.97876 17.4725 6.15968H17.4701L17.4655 6.16203C17.4623 6.16291 17.4562 6.16319 17.4514 6.16437C17.4414 6.16711 17.4276 6.17182 17.4115 6.17611C17.3776 6.18504 17.3286 6.19725 17.2706 6.21132C17.1544 6.23948 16.9902 6.2757 16.7965 6.31224C16.4152 6.38414 15.8784 6.46225 15.3202 6.46246H13.4518C12.7883 6.46246 12.2504 5.92419 12.2501 5.26073C12.2502 4.59713 12.7882 4.05901 13.4518 4.05901H15.3202C15.6733 4.05879 16.0505 4.00808 16.3529 3.95104C16.4996 3.92334 16.6221 3.89604 16.705 3.87593C16.7452 3.86616 16.7771 3.85758 16.7965 3.85246L16.8176 3.84542Z"
        fill={props.accent2}
      />
    </svg>
  );
};
export const Planet4 = (props: { rot: number; accent2: string }) => {
  return (
    <svg
      transform={`rotate(${(props.rot - 180) / 10})`}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.0064 0.893194C13.2636 1.13945 16.379 3.59257 18.0311 6.51686C18.9306 8.10931 19.4601 9.94299 19.3173 11.7885C19.1812 13.5446 18.4402 15.2456 16.9561 16.6728L16.6487 16.9544C14.5532 18.7935 12.4256 19.652 10.3866 19.7545C8.35743 19.8564 6.53416 19.2029 5.04223 18.2242C3.55644 17.2495 2.36406 15.9319 1.56147 14.6214C0.785958 13.3551 0.264607 11.9131 0.392613 10.6971C0.591533 8.80864 1.48222 6.43625 2.93922 4.50774C4.39884 2.57605 6.56574 0.919628 9.35387 0.87207L10.0064 0.893194ZM9.06283 3.29429C7.41784 3.44144 5.98422 4.46393 4.85681 5.9559C3.65209 7.55038 2.93574 9.51247 2.78431 10.9482C2.73736 11.3943 2.94796 12.2837 3.6105 13.3657C4.24622 14.4038 5.19973 15.4531 6.36131 16.2151C7.51657 16.9728 8.84416 17.4249 10.2669 17.3535C11.6797 17.2823 13.3075 16.6892 15.0644 15.1472L15.4916 14.7388C16.4148 13.7679 16.8367 12.6896 16.9209 11.603C17.0191 10.3341 16.6595 8.97408 15.9398 7.69981C14.4629 5.08498 11.7371 3.23645 9.39611 3.27551L9.06283 3.29429ZM7.79304 15.3232C6.73141 14.2223 7.66222 12.4132 9.22712 12.732C10.4936 12.9905 11.3582 13.9591 11.0555 15.2152C10.7702 16.3957 8.74833 16.3133 7.79304 15.3232ZM13.8509 7.98146C14.8443 8.22655 15.8629 10.2438 15.6019 11.2815C15.1392 13.1181 12.6298 12.9634 11.5085 11.4434C10.3887 9.92365 12.1908 7.57255 13.8509 7.98146ZM9.0816 5.06635C11.2743 5.16594 13.5401 6.25595 10.5251 9.29584C7.51037 12.3355 7.56242 13.2872 5.42012 12.1664C3.89789 11.3698 4.87193 8.40527 5.42012 7.53316C5.9683 6.66116 8.24986 4.98635 9.0816 5.06635Z"
        fill={props.accent2}
      />
    </svg>
  );
};
