import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ProcessControl from "../../client/src/components/ProcessControl";
import { useProcessing, usePreview } from "../../client/src/hooks/use-processing";

// Mock the shadcn components
vi.mock("@/components/ui/card", () => {
  const { Card, CardContent } = require("../../tests/mocks/ui-components");
  return { Card, CardContent };
});

vi.mock("@/components/ui/button", () => {
  const { Button } = require("../../tests/mocks/ui-components");
  return { Button };
});

vi.mock("@/components/ui/progress", () => {
  const { Progress } = require("../../tests/mocks/ui-components");
  return { Progress };
});

// Mock the app components
vi.mock("@/components/ConsoleView", () => {
  const { ConsoleView } = require("../../tests/mocks/app-components");
  return { default: ConsoleView };
});

vi.mock("@/components/PreviewModal", () => {
  const { PreviewModal } = require("../../tests/mocks/app-components");
  return { default: PreviewModal };
});

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

describe("ProcessControl - Progress Bar", () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock the useProcessing hook
    vi.mocked(useProcessing).mockReturnValue({
      status: "idle",
      processedRows: 0,
      totalRows: 0,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
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

  it("should not display progress bar when status is idle", () => {
    // Arrange - mock the hook with idle status
    vi.mocked(useProcessing).mockReturnValue({
      status: "idle",
      processedRows: 0,
      totalRows: 0,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: false,
      isProcessing: false
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="idle"
        processedRows={0}
        totalRows={100}
      />
    );

    // Assert
    const progressElement = screen.queryByText("Processing Progress");
    expect(progressElement).toBeNull();
  });

  it("should display progress bar when status is processing", () => {
    // Arrange - mock the hook with processing status
    vi.mocked(useProcessing).mockReturnValue({
      status: "processing",
      processedRows: 40,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: false,
      isProcessing: true
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="processing"
        processedRows={40}
        totalRows={100}
      />
    );

    // Assert
    const progressElement = screen.getByText("Processing Progress");
    expect(progressElement).toBeInTheDocument();
    
    const rowCounterElement = screen.getByText("40/100 rows");
    expect(rowCounterElement).toBeInTheDocument();
  });

  it("should display progress bar with correct percentage when processing", () => {
    // Arrange - mock the hook with 50% processed
    vi.mocked(useProcessing).mockReturnValue({
      status: "processing",
      processedRows: 50,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: false,
      isProcessing: true
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="processing"
        processedRows={50}
        totalRows={100}
      />
    );

    // Assert
    const progressElement = screen.getByText("Processing Progress");
    expect(progressElement).toBeInTheDocument();
    
    // Check that the progress bar contains the correct value
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it("should display progress bar when status is paused", () => {
    // Arrange - mock the hook with paused status
    vi.mocked(useProcessing).mockReturnValue({
      status: "paused",
      processedRows: 30,
      totalRows: 100,
      isStatusLoading: false,
      startProcessing: vi.fn(),
      pauseProcessing: vi.fn(),
      resumeProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      downloadEnrichedCsv: vi.fn(),
      isDownloading: false,
      isProcessing: false
    });

    // Act
    render(
      <ProcessControl
        csvFile={{ id: 1, filename: "test.csv", headers: ["col1", "col2"], rowCount: 100 }}
        promptConfigs={[{ promptTemplate: "test", outputColumnName: "output" }]}
        status="paused"
        processedRows={30}
        totalRows={100}
      />
    );

    // Assert
    const progressElement = screen.getByText("Processing Progress");
    expect(progressElement).toBeInTheDocument();
    
    // Check that the progress bar shows the correct percentage
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
  });

  it("should display progress bar at 100% when status is completed", () => {
    // Arrange - mock the hook with completed status
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

    // Assert
    const progressElement = screen.getByText("Processing Progress");
    expect(progressElement).toBeInTheDocument();
    
    const rowCounterElement = screen.getByText("100/100 rows");
    expect(rowCounterElement).toBeInTheDocument();
    
    // Check that the progress bar shows 100%
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
});