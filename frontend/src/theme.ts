import { createTheme } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#573B8A",
      },
      secondary: {
        main: "#6D44B8",
      },
      background: {
        default: mode === "light" ? "#F5F6FA" : "#232228",
        paper: mode === "light" ? "#FFFFFF" : "#232228",
        light:
          mode === "light"
            ? "linear-gradient(45deg,rgb(255, 255, 255), #e0e0e0,rgb(227, 228, 230))"
            : "#232228",
      },
      text: {
        primary: mode === "light" ? "#1D1B2A" : "#F6F3FF",
        secondary: mode === "light" ? "#5B5670" : "#D1C6EC",
      },
    },
    shape: {
      borderRadius: 14, // 👈 bordes redondeados
    },
    typography: {
      fontFamily: "Jost, Inter, sans-serif",
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
           body: {
            margin: 0,
            minHeight: "100vh",
            fontFamily: "Jost, Inter, sans-serif",
            background:
              mode === "light"
                ? "linear-gradient(to bottom, #f8f9ff, #eceffd, #e3e8fb)"
                : "linear-gradient(to bottom, #232228, #302b63, #24243e)",
            backgroundAttachment: "fixed",
            color: mode === "light" ? "#1D1B2A" : "#F6F3FF",
          },
          ".main": {
            width: "350px",
            height: "500px",
            overflow: "hidden",
            backgroundImage:
              'url("https://doc-08-2c-docs.googleusercontent.com/docs/securesc/68c90smiglihng9534mvqmq1946dmis5/fo0picsp1nhiucmc0l25s29respgpr4j/1631524275000/03522360960922298374/03522360960922298374/1Sx0jhdpEpnNIydS4rnN4kHSJtU1EyWka?e=view&authuser=0&nonce=gcrocepgbb17m&user=03522360960922298374&hash=tfhgbs86ka6divo3llbvp93mg4csvb38")',
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
            borderRadius: "10px",
            boxShadow: "5px 20px 50px #000",
          },
          "#root": {
            minHeight: "100vh",
          },
        },
      },
    },
  });