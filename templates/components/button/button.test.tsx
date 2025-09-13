import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("handles different variants", () => {
    render(
      <>
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  it("shows loading state", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("cursor-wait");
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("spreads additional props", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
