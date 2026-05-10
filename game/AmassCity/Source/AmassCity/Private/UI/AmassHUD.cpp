#include "UI/AmassHUD.h"

#include "Engine/Canvas.h"
#include "Engine/Font.h"

#include "Player/AmassCharacter.h"
#include "Vehicles/AmassVehicleBase.h"
#include "Systems/WantedLevelComponent.h"

void AAmassHUD::DrawHUD()
{
	Super::DrawHUD();

	if (!Canvas)
	{
		return;
	}

	DrawWantedStars();
	DrawSpeedometer();
	DrawMinimapPlaceholder();
}

void AAmassHUD::DrawWantedStars()
{
	APlayerController* PC = GetOwningPlayerController();
	if (!PC)
	{
		return;
	}

	AAmassCharacter* Player = Cast<AAmassCharacter>(PC->GetPawn());
	if (!Player || !Player->GetWantedLevel())
	{
		return;
	}

	const int32 Stars = Player->GetWantedLevel()->GetLevel();
	const float StartX = Canvas->SizeX - 220.f;
	const float StartY = 40.f;
	for (int32 i = 0; i < 5; ++i)
	{
		const FLinearColor Color = (i < Stars) ? FLinearColor::Yellow : FLinearColor(0.2f, 0.2f, 0.2f, 0.8f);
		FCanvasTileItem Tile(FVector2D(StartX + i * 36.f, StartY), FVector2D(28.f, 28.f), Color);
		Tile.BlendMode = SE_BLEND_Translucent;
		Canvas->DrawItem(Tile);
	}
}

void AAmassHUD::DrawSpeedometer()
{
	APlayerController* PC = GetOwningPlayerController();
	if (!PC)
	{
		return;
	}

	AAmassVehicleBase* Vehicle = Cast<AAmassVehicleBase>(PC->GetPawn());
	if (!Vehicle)
	{
		return;
	}

	const FString Text = FString::Printf(TEXT("%.0f km/h"), Vehicle->GetSpeedKmh());
	FCanvasTextItem TextItem(FVector2D(Canvas->SizeX - 220.f, Canvas->SizeY - 80.f),
		FText::FromString(Text), GEngine->GetLargeFont(), FLinearColor::White);
	TextItem.Scale = FVector2D(1.4f, 1.4f);
	Canvas->DrawItem(TextItem);
}

void AAmassHUD::DrawMinimapPlaceholder()
{
	const FVector2D Pos(40.f, Canvas->SizeY - 220.f);
	const FVector2D Size(180.f, 180.f);
	FCanvasTileItem Tile(Pos, Size, FLinearColor(0.f, 0.f, 0.f, 0.45f));
	Tile.BlendMode = SE_BLEND_Translucent;
	Canvas->DrawItem(Tile);

	FCanvasTextItem TextItem(Pos + FVector2D(60.f, 80.f),
		FText::FromString(TEXT("Minimap")), GEngine->GetMediumFont(), FLinearColor::White);
	Canvas->DrawItem(TextItem);
}
