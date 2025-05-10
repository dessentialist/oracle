import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ProcessControl from "../../client/src/components/ProcessControl";
import { useProcessing, usePreview } from "../../client/src/hooks/use-processing";

// Mock the hooks
vi.mock("../../client/src/hooks/use-processing", () => ({
  useProcessing: vi.fn(),
  usePreview: vi.fn()
}));

// Mock the toast hook
vi.mock("../../client/src/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock the window.URL methods
const createObjectURLMock = vi.fn();
const revokeObjectURLMock = vi.fn();

// Mock document.createElement to track creation of the download anchor
const originalCreateElement = document.createElement;
let mockAnchor: { style: Record<string, string>; href: string; download: string; click: ReturnType<typeof vi.fn> } | null = null;

describe("ProcessControl - Download Button", () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    mockAnchor = null;
    
    // Mock URL methods
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    createObjectURLMock.mockReturnValue("mock-url");
    
    // Mock document.createElement
    document.createElement = ((tagName: string) => {
      if (tagName === "a") {
        mockAnchor = {
          style: {},
          href: "",
          download: "",
          click: vi.fn()
        };
        return mockAnchor as unknown as HTMLElement;
      }
      return originalCreateElement.call(document, tagName);
    }) as typeof document.createElement;
    
    // Mock appendChild and removeChild
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    // Mock the useProcessing hook with default values
    const downloadEnrichedCsvMock = vi.fn();
    vi.mocked(useProcessing).mockReturnValue({
      status: "completed",
      processedRows: 100,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: downloadEnrichedCsvMock,
      isDownloading: false,
      isProcessing: false
    });

    // Mock the usePreview hook
    vi.mocked(usePreview).mockReturnValue({
      previewPrompts: vi.fn(),
      previewData: null,
      isPreviewLoading: false
    });
  });

  afterEach(() => {
    // Restore original methods
    document.createElement = originalCreateElement;
  });

  it("should display the download button", () => {
    // Arrange + Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="completed"
        processedRows={100}
        totalRows={100}
      />
    );

    // Assert
    const downloadButton = screen.getByText("Download Enriched CSV");
    expect(downloadButton).toBeInTheDocument();
  });

  it("should call downloadEnrichedCsv when download button is clicked", async () => {
    // Arrange
    const downloadMock = vi.fn();
    vi.mocked(useProcessing).mockReturnValue({
      status: "completed",
      processedRows: 100,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: downloadMock,
      isDownloading: false,
      isProcessing: false
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="completed"
        processedRows={100}
        totalRows={100}
      />
    );

    // Find and click the download button
    const downloadButton = screen.getByText("Download Enriched CSV");
    fireEvent.click(downloadButton);

    // Assert
    expect(downloadMock).toHaveBeenCalled();
  });

  it("should show loading state when download is in progress", () => {
    // Arrange - mock the hook with downloading state
    vi.mocked(useProcessing).mockReturnValue({
      status: "completed",
      processedRows: 100,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: true, // Set downloading state to true
      isProcessing: false
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="completed"
        processedRows={100}
        totalRows={100}
      />
    );

    // Assert - check for the "Downloading..." text
    const downloadingText = screen.getByText("Downloading...");
    expect(downloadingText).toBeInTheDocument();
    
    // Check that the spinner is visible
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it("should disable the download button when download is in progress", () => {
    // Arrange - mock the hook with downloading state
    vi.mocked(useProcessing).mockReturnValue({
      status: "completed",
      processedRows: 100,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: true, // Set downloading state to true
      isProcessing: false
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="completed"
        processedRows={100}
        totalRows={100}
      />
    );

    // Find the download button (now showing "Downloading...")
    const downloadButton = screen.getByText("Downloading...");
    const buttonElement = downloadButton.closest('button');
    
    // Assert - button should be disabled
    expect(buttonElement).toBeDisabled();
  });
});