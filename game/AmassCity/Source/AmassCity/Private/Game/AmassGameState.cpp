#include "Game/AmassGameState.h"

AAmassGameState::AAmassGameState()
{
	PrimaryActorTick.bCanEverTick = true;
}

void AAmassGameState::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (HasAuthority())
	{
		WorldHour = FMath::Fmod(WorldHour + (DeltaSeconds * MinutesPerRealSecond) / 60.f, 24.f);
		const EAmassTimeOfDay NewPhase = ComputePhase(WorldHour);
		if (NewPhase != CurrentPhase)
		{
			CurrentPhase = NewPhase;
			OnTimeOfDayChanged.Broadcast(CurrentPhase);
		}
	}
}

EAmassTimeOfDay AAmassGameState::ComputePhase(float Hour) const
{
	if (Hour < 6.f)  return EAmassTimeOfDay::Night;
	if (Hour < 8.f)  return EAmassTimeOfDay::Dawn;
	if (Hour < 18.f) return EAmassTimeOfDay::Day;
	if (Hour < 20.f) return EAmassTimeOfDay::Dusk;
	return EAmassTimeOfDay::Night;
}
