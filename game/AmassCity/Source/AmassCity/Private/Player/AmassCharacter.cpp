#include "Player/AmassCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "Kismet/GameplayStatics.h"

#include "Player/AmassPlayerController.h"
#include "Vehicles/AmassVehicleBase.h"
#include "Systems/WantedLevelComponent.h"
#include "Systems/HealthComponent.h"

AAmassCharacter::AAmassCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	GetCapsuleComponent()->InitCapsuleSize(42.f, 92.f);
	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	UCharacterMovementComponent* Movement = GetCharacterMovement();
	Movement->bOrientRotationToMovement = true;
	Movement->RotationRate = FRotator(0.f, 540.f, 0.f);
	Movement->JumpZVelocity = 600.f;
	Movement->AirControl = 0.35f;
	Movement->MaxWalkSpeed = WalkSpeed;
	Movement->MinAnalogWalkSpeed = 20.f;
	Movement->BrakingDecelerationWalking = 2000.f;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 380.f;
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->SocketOffset = FVector(0.f, 60.f, 60.f);

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;

	WantedLevel = CreateDefaultSubobject<UWantedLevelComponent>(TEXT("WantedLevel"));
	Health = CreateDefaultSubobject<UHealthComponent>(TEXT("Health"));
}

void AAmassCharacter::BeginPlay()
{
	Super::BeginPlay();
	ApplyDefaultMappingContext();
}

void AAmassCharacter::PossessedBy(AController* NewController)
{
	Super::PossessedBy(NewController);
	ApplyDefaultMappingContext();
}

void AAmassCharacter::ApplyDefaultMappingContext()
{
	APlayerController* PC = Cast<APlayerController>(GetController());
	if (!PC || !DefaultMappingContext)
	{
		return;
	}

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
	{
		Subsystem->RemoveMappingContext(DefaultMappingContext);
		Subsystem->AddMappingContext(DefaultMappingContext, 0);
	}
}

void AAmassCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
}

void AAmassCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (MoveAction)     EIC->BindAction(MoveAction,     ETriggerEvent::Triggered, this, &AAmassCharacter::Move);
		if (LookAction)     EIC->BindAction(LookAction,     ETriggerEvent::Triggered, this, &AAmassCharacter::Look);
		if (JumpAction)
		{
			EIC->BindAction(JumpAction, ETriggerEvent::Started,   this, &ACharacter::Jump);
			EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
		}
		if (SprintAction)
		{
			EIC->BindAction(SprintAction, ETriggerEvent::Started,   this, &AAmassCharacter::StartSprint);
			EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &AAmassCharacter::StopSprint);
		}
		if (InteractAction) EIC->BindAction(InteractAction, ETriggerEvent::Started,   this, &AAmassCharacter::Interact);
		if (FireAction)     EIC->BindAction(FireAction,     ETriggerEvent::Triggered, this, &AAmassCharacter::Fire);
	}
}

void AAmassCharacter::Move(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller || Axis.IsNearlyZero())
	{
		return;
	}

	const FRotator YawOnly(0.f, Controller->GetControlRotation().Yaw, 0.f);
	const FVector Forward = FRotationMatrix(YawOnly).GetUnitAxis(EAxis::X);
	const FVector Right   = FRotationMatrix(YawOnly).GetUnitAxis(EAxis::Y);
	AddMovementInput(Forward, Axis.Y);
	AddMovementInput(Right,   Axis.X);
}

void AAmassCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller)
	{
		return;
	}
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(Axis.Y);
}

void AAmassCharacter::StartSprint()
{
	GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
}

void AAmassCharacter::StopSprint()
{
	GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}

void AAmassCharacter::Interact()
{
	if (IsInVehicle())
	{
		ExitVehicle();
	}
	else
	{
		TryEnterVehicle();
	}
}

void AAmassCharacter::Fire()
{
	// Hooked up by weapon component / ability system — left intentionally minimal here.
}

AAmassVehicleBase* AAmassCharacter::FindNearestVehicle() const
{
	TArray<AActor*> Candidates;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), AAmassVehicleBase::StaticClass(), Candidates);

	AAmassVehicleBase* Nearest = nullptr;
	float NearestSqDist = FMath::Square(VehicleInteractRange);
	const FVector MyLoc = GetActorLocation();

	for (AActor* A : Candidates)
	{
		const float SqDist = FVector::DistSquared(MyLoc, A->GetActorLocation());
		if (SqDist <= NearestSqDist)
		{
			NearestSqDist = SqDist;
			Nearest = Cast<AAmassVehicleBase>(A);
		}
	}
	return Nearest;
}

void AAmassCharacter::TryEnterVehicle()
{
	AAmassVehicleBase* Vehicle = FindNearestVehicle();
	if (!Vehicle || !Controller)
	{
		return;
	}

	APlayerController* PC = Cast<APlayerController>(Controller);
	if (!PC)
	{
		return;
	}

	CurrentVehicle = Vehicle;
	Vehicle->SetDriver(this);
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	GetCharacterMovement()->DisableMovement();
	PC->Possess(Vehicle);
}

void AAmassCharacter::ExitVehicle()
{
	if (!CurrentVehicle)
	{
		return;
	}

	APlayerController* PC = Cast<APlayerController>(CurrentVehicle->GetController());
	const FVector ExitLoc = CurrentVehicle->GetActorLocation()
		+ CurrentVehicle->GetActorRightVector() * 200.f
		+ FVector(0.f, 0.f, 50.f);

	SetActorLocation(ExitLoc, false, nullptr, ETeleportType::TeleportPhysics);
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
	GetCharacterMovement()->SetMovementMode(MOVE_Walking);

	CurrentVehicle->SetDriver(nullptr);
	if (PC)
	{
		PC->Possess(this);
	}
	CurrentVehicle = nullptr;
}
