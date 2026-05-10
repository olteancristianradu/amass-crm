#include "Systems/WantedLevelComponent.h"

UWantedLevelComponent::UWantedLevelComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UWantedLevelComponent::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	TimeSinceLastCrime += DeltaTime;
	if (HeatPoints > 0.f && TimeSinceLastCrime >= DecayDelayAfterCrime && DecaySecondsPerLevel > 0.f)
	{
		HeatPoints = FMath::Max(0.f, HeatPoints - (DeltaTime / DecaySecondsPerLevel));
		RecomputeLevel();
	}
}

void UWantedLevelComponent::ReportCrime(int32 Severity)
{
	if (Severity <= 0)
	{
		return;
	}

	HeatPoints = FMath::Min(static_cast<float>(MaxWantedLevel), HeatPoints + Severity * 0.5f);
	TimeSinceLastCrime = 0.f;
	RecomputeLevel();
}

void UWantedLevelComponent::ClearWanted()
{
	HeatPoints = 0.f;
	RecomputeLevel();
}

void UWantedLevelComponent::RecomputeLevel()
{
	const int32 NewLevel = FMath::Clamp(FMath::FloorToInt(HeatPoints), 0, MaxWantedLevel);
	if (NewLevel != WantedLevel)
	{
		WantedLevel = NewLevel;
		OnWantedLevelChanged.Broadcast(WantedLevel);
	}
}
