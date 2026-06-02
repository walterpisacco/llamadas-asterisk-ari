import Button from "@mui/material/Button";

export default function AppButton(props: any) {
  const { children, sx, ...rest } = props;

  return (
    <Button
      variant="text"
      sx={(theme) => ({
        position: "relative",
        width: "150px",
        height: "50px",
        minWidth: "160px",
        padding: 0,
        overflow: "visible",
        isolation: "isolate",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        fontFamily: "'Poppins', sans-serif",
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          transition: "inset 0.5s ease, filter 0.5s ease",
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(45deg, ${theme.palette.info.light}, ${theme.palette.info.light}, ${theme.palette.primary.main})`
              : `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.main}, ${theme.palette.primary.light})`,
          zIndex: 1,
          borderRadius: '10px',
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
        },
        "&::after": {
          filter: "none",
        },
        "&:hover::before": {
          inset: "-3px",
        },
        "&:hover::after": {
          inset: "-3px",
          filter: "blur(10px)",
        },
        "& .app-btn-label": {
          position: "relative",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            theme.palette.mode === "dark"
              ? theme.palette.background.default
              : `linear-gradient(45deg,rgb(234, 235, 236), #e0e0e0, #899098)`,
          color: theme.palette.text.primary,
          fontSize: "1.2em",
          letterSpacing: "2px",
          textTransform: "uppercase",
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          fontFamily: "inherit",
          borderRadius: '10px',
        },
        "& .app-btn-label::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: "-50%",
          width: "100%",
          height: "100%",
          background: "rgba(255, 255, 255, 0.22)",
          transform: "skew(25deg)",
        },
        "&:hover": {
          background: "transparent",
        },
        "&:active": {
          transform: "translateY(1px)",
        },
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
      {...rest}
    >
      <span className="app-btn-label">{children}</span>
    </Button>
  );
}