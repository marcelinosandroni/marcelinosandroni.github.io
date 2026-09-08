import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExperienceMediaGallery } from "@/components/experience/media-gallery";
import type { ResumeMediaAsset } from "@/domain/resume/types";

describe("ExperienceMediaGallery", () => {
  const mockAssets: ResumeMediaAsset[] = [
    {
      type: "image",
      url: "https://example.com/image.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
      caption: "Project Screenshot",
    },
    {
      type: "video",
      url: "https://example.com/video.mp4",
      caption: "Demo Video",
    },
    {
      type: "link",
      url: "https://example.com/project",
      caption: "Live Project",
    },
    {
      type: "document",
      url: "https://example.com/doc.pdf",
      caption: "Technical Documentation",
    },
  ];

  it("should return null when assets array is empty", () => {
    const { container } = render(<ExperienceMediaGallery assets={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when assets is undefined", () => {
    const { container } = render(<ExperienceMediaGallery assets={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render grid of media thumbnails", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);

    // Check that each asset has a button with appropriate aria-label
    expect(buttons[0]).toHaveAttribute("aria-label", "Project Screenshot");
    expect(buttons[1]).toHaveAttribute("aria-label", "Demo Video");
    expect(buttons[2]).toHaveAttribute("aria-label", "Live Project");
    expect(buttons[3]).toHaveAttribute("aria-label", "Technical Documentation");
  });

  it("should display icons for assets without thumbnails", () => {
    const assetsWithoutThumbs: ResumeMediaAsset[] = [
      { type: "image", url: "https://example.com/img.jpg" },
      { type: "video", url: "https://example.com/vid.mp4" },
      { type: "link", url: "https://example.com/link" },
      { type: "document", url: "https://example.com/doc.pdf" },
    ];

    render(<ExperienceMediaGallery assets={assetsWithoutThumbs} />);

    // Should display emoji icons (🖼️, 🎬, 🔗, 📄)
    expect(screen.getByText("🖼️")).toBeInTheDocument();
    expect(screen.getByText("🎬")).toBeInTheDocument();
    expect(screen.getByText("🔗")).toBeInTheDocument();
    expect(screen.getByText("📄")).toBeInTheDocument();
  });

  it("should open modal when clicking on an asset", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    const firstButton = screen.getAllByRole("button")[0];
    fireEvent.click(firstButton);

    // Modal should appear with the asset details
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Project Screenshot")).toBeInTheDocument();
  });

  it("should close modal when clicking close button", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    // Open modal
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByLabelText("Close modal");
    fireEvent.click(closeButton);

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should close modal when clicking outside content", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    // Open modal
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click on overlay (outside content)
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should display image in modal for image type", () => {
    render(<ExperienceMediaGallery assets={[mockAssets[0]]} />);

    fireEvent.click(screen.getByRole("button"));

    const img = screen.getByAltText("Project Screenshot");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("should display video player in modal for video type", () => {
    render(<ExperienceMediaGallery assets={[mockAssets[1]]} />);

    fireEvent.click(screen.getByRole("button"));

    const video = screen.getByLabelText("Demo Video");
    expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    expect(video).toHaveAttribute("controls");
  });

  it("should display link in modal for link type", () => {
    render(<ExperienceMediaGallery assets={[mockAssets[2]]} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Live Project")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open Link/i });
    expect(link).toHaveAttribute("href", "https://example.com/project");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should display document download link in modal for document type", () => {
    render(<ExperienceMediaGallery assets={[mockAssets[3]]} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Technical Documentation")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Download\/View Document/i });
    expect(link).toHaveAttribute("href", "https://example.com/doc.pdf");
  });

  it("should handle keyboard focus correctly", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    const buttons = screen.getAllByRole("button");

    // Check that buttons are focusable
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute("tabIndex", "-1");
    });
  });

  it("should apply hover styles via className", () => {
    render(<ExperienceMediaGallery assets={mockAssets} />);

    const firstButton = screen.getAllByRole("button")[0];
    expect(firstButton.className).toContain("hover:ring-2");
    expect(firstButton.className).toContain("hover:ring-blue-500");
  });
});
