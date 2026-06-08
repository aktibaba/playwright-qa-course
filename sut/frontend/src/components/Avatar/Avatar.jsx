import avatar from "../../assets/default-avatar.svg";

function Avatar({ alt, className, src }) {
  return (
    <img
      alt={alt || "placeholder"}
      className={className || ""}
      src={src || avatar}
    />
  );
}

export default Avatar;
