#include "AI/AmassNPCCharacter.h"

#include "Systems/HealthComponent.h"

AAmassNPCCharacter::AAmassNPCCharacter()
{
	PrimaryActorTick.bCanEverTick = false;
	Health = CreateDefaultSubobject<UHealthComponent>(TEXT("Health"));
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
}

void AAmassNPCCharacter::BeginPlay()
{
	Super::BeginPlay();
}
